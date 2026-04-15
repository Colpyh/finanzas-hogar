"use server";

import crypto from "crypto";
import { db } from "@/shared/lib/db";
import { household, householdInvite, householdMember } from "@/shared/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { updateHouseholdSchema } from "./types";

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

  revalidatePath("/ajustes");
  return updated;
}

export async function createInvite() {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) throw new Error("No household");
  if (userHousehold.role !== "owner") throw new Error("Solo el propietario puede invitar");

  // NFR-2: 256-bit entropy token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(householdInvite)
    .values({
      householdId: userHousehold.id,
      token,
      createdBy: user.id,
      expiresAt,
    })
    .returning();

  revalidatePath("/ajustes");
  return invite;
}

export async function generateInvite(): Promise<void> {
  await createInvite();
  redirect("/ajustes");
}

export async function revokeInvite(inviteId: string) {
  await getUser();

  await db
    .update(householdInvite)
    .set({ redeemedAt: new Date() })
    .where(eq(householdInvite.id, inviteId));

  revalidatePath("/ajustes");
}

export async function addMemberByEmail(
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) return { error: "No tienes un hogar" };
  if (userHousehold.role !== "owner") return { error: "Solo el propietario puede agregar miembros" };

  const query = (formData.get("query") as string | null)?.trim().toLowerCase() ?? "";
  if (!query) return { error: "Ingresa un nombre o correo" };

  let users: { id: string; email?: string; user_metadata: Record<string, string> }[];
  try {
    const supabase = createAdminClient();
    const { data, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return { error: "Error al buscar usuarios. Verificá que SUPABASE_SERVICE_ROLE_KEY esté configurada." };
    users = data.users;
  } catch {
    return { error: "Error de configuración del servidor. SUPABASE_SERVICE_ROLE_KEY no está disponible." };
  }

  const target = users.find((u) => {
    const name = (u.user_metadata?.full_name ?? u.user_metadata?.name ?? "").toLowerCase();
    return u.email?.toLowerCase() === query || name.includes(query);
  });

  if (!target) return { error: "No se encontró ningún usuario con ese nombre o correo" };
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

  revalidatePath("/ajustes");
  return {};
}

export async function removeMember(memberId: string) {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) throw new Error("No household");
  if (userHousehold.role !== "owner") throw new Error("Solo el propietario puede eliminar miembros");

  const [target] = await db
    .select()
    .from(householdMember)
    .where(eq(householdMember.id, memberId))
    .limit(1);

  if (!target) throw new Error("Miembro no encontrado");
  if (target.userId === user.id) throw new Error("No puedes eliminarte a ti mismo");

  await db.delete(householdMember).where(eq(householdMember.id, memberId));

  revalidatePath("/ajustes");
}
