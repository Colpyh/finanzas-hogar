"use server";

import crypto from "crypto";
import { db } from "@/shared/lib/db";
import { household, householdInvite, householdMember } from "@/shared/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold, userHouseholdTag } from "@/onboarding/queries";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { updateHouseholdSchema } from "./types";
import { getHouseholdMembers } from "./queries";
import { getPendingBalances } from "@/balances/queries";
import { formatCurrency } from "@/shared/components/currency-display";

export async function updateHousehold(rawData: unknown) {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) throw new Error("No household");

  const { name } = updateHouseholdSchema.parse(rawData);

  const [updated] = await db
    .update(household)
    .set({ name })
    .where(eq(household.id, userHousehold.id))
    .returning();

  // La membresía cacheada (getUserHousehold) incluye el nombre del hogar.
  updateTag(userHousehold.id);
  revalidatePath("/ajustes");
  return updated;
}

export async function createInvite(): Promise<{ error?: string; token?: string }> {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) return { error: "No tienes un hogar activo" };
  if (userHousehold.role !== "owner") return { error: "Solo el propietario puede invitar" };

  // NFR-2: 256-bit entropy token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(householdInvite).values({
    householdId: userHousehold.id,
    token,
    createdBy: user.id,
    expiresAt,
  });

  revalidatePath("/ajustes");
  return { token };
}

export async function generateInvite(): Promise<void> {
  await createInvite();
  redirect("/ajustes");
}

export async function revokeInvite(inviteId: string) {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) throw new Error("No household");

  await db
    .update(householdInvite)
    .set({ redeemedAt: new Date() })
    .where(and(eq(householdInvite.id, inviteId), eq(householdInvite.householdId, userHousehold.id)));

  revalidatePath("/ajustes");
}

export async function addMemberByEmail(
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) return { error: "No tienes un hogar" };
  if (userHousehold.role !== "owner") return { error: "Solo el propietario puede agregar miembros" };

  const email = (formData.get("query") as string | null)?.trim().toLowerCase() ?? "";
  if (!email) return { error: "Ingresa el correo electrónico del usuario" };
  if (!email.includes("@")) return { error: "Ingresa un correo electrónico válido" };

  let target: { id: string; email?: string; user_metadata: Record<string, string> } | null = null;
  try {
    const supabase = createAdminClient();
    const { data, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return { error: "Error al buscar usuarios." };
    target = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  } catch {
    return { error: "Error de configuración del servidor." };
  }

  if (!target) return { error: "No se encontró ningún usuario con ese correo" };
  if (target.id === user.id) return { error: "No puedes agregarte a ti mismo" };

  const [existing] = await db
    .select({ id: householdMember.id })
    .from(householdMember)
    .where(and(eq(householdMember.householdId, userHousehold.id), eq(householdMember.userId, target.id)))
    .limit(1);

  if (existing) return { error: "Este usuario ya es miembro del hogar" };

  const displayName =
    target.user_metadata?.full_name ?? target.user_metadata?.name ?? target.email ?? null;

  await db.insert(householdMember).values({
    householdId: userHousehold.id,
    userId: target.id,
    role: "member",
    displayName,
  });

  updateTag(userHousehold.id);
  updateTag(userHouseholdTag(target.id));
  revalidatePath("/ajustes");
  return {};
}

// Devuelve { error } en vez de lanzar: Next.js redacta en producción los
// mensajes de errores lanzados en Server Actions, así que un throw nunca
// llega legible al usuario (y escala al error boundary de toda la página).
export async function removeMember(memberId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) return { error: "No tienes un hogar activo" };
  if (userHousehold.role !== "owner") return { error: "Solo el propietario puede eliminar miembros" };

  const [target] = await db
    .select()
    .from(householdMember)
    .where(and(eq(householdMember.id, memberId), eq(householdMember.householdId, userHousehold.id)))
    .limit(1);

  if (!target) return { error: "Miembro no encontrado" };
  if (target.userId === user.id) return { error: "No puedes eliminarte a ti mismo" };

  // No dejar eliminar a alguien con saldo pendiente: getPendingBalances calcula la
  // deuda a partir de los miembros activos, así que borrar la fila la haría
  // desaparecer del balance sin haberse saldado realmente.
  const members = await getHouseholdMembers(userHousehold.id);
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? "Usuario"]));
  const balances = await getPendingBalances(userHousehold.id, members.length, memberMap, user.id);
  const pending = balances.find((b) => b.memberId === target.userId);
  if (pending && pending.net !== 0) {
    return {
      error: `No puedes eliminar a este miembro: tiene un saldo pendiente de ${formatCurrency(Math.abs(pending.net))}. Salda las deudas primero.`,
    };
  }

  await db.delete(householdMember).where(and(eq(householdMember.id, memberId), eq(householdMember.householdId, userHousehold.id)));

  updateTag(userHousehold.id);
  updateTag(userHouseholdTag(target.userId));
  revalidatePath("/ajustes");
  return {};
}
