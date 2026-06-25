"use server";

import { db } from "@/shared/lib/db";
import { card } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { addCardSchema, updateCardSchema } from "./types";

export async function addCard(rawData: unknown): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "No tienes un hogar activo" };

    const data = addCardSchema.parse(rawData);

    await db.insert(card).values({
      householdId: household.id,
      name: data.name,
      lastFour: data.lastFour || null,
      color: data.color,
      creditLimit: data.creditLimit || null,
      closingDay: data.closingDay ?? null,
      paymentDueDay: data.paymentDueDay ?? null,
    });

    updateTag(household.id);
    revalidatePath("/ajustes");
    revalidatePath("/compras/nuevo");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function updateCard(id: string, rawData: unknown): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "Sin hogar activo" };

    const data = updateCardSchema.parse(rawData);

    await db
      .update(card)
      .set({
        name: data.name,
        lastFour: data.lastFour || null,
        color: data.color,
        creditLimit: data.creditLimit || null,
        closingDay: data.closingDay ?? null,
        paymentDueDay: data.paymentDueDay ?? null,
      })
      .where(and(eq(card.id, id), eq(card.householdId, household.id)));

    updateTag(household.id);
    revalidatePath("/ajustes");
    revalidatePath("/compras");
    revalidatePath("/compras/nuevo");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function deleteCard(id: string): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "Sin hogar activo" };

    await db
      .update(card)
      .set({ isActive: false })
      .where(and(eq(card.id, id), eq(card.householdId, household.id)));

    updateTag(household.id);
    revalidatePath("/ajustes");
    revalidatePath("/compras/nuevo");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al eliminar" };
  }
}
