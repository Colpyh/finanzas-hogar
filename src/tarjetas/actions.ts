"use server";

import { db } from "@/shared/lib/db";
import { card } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { requireHousehold } from "@/household/guards";
import { addCardSchema, updateCardSchema } from "./types";

export async function addCard(rawData: unknown): Promise<{ error?: string }> {
  try {
    const auth = await requireHousehold();
    if (!auth.ok) return { error: auth.error };
    const { household } = auth;

    const data = addCardSchema.parse(rawData);

    await db.insert(card).values({
      householdId: household.id,
      name: data.name,
      lastFour: data.lastFour || null,
      kind: data.kind,
      color: data.color,
      creditLimit: data.creditLimit || null,
      // Débito no tiene ciclo de facturación — sin cierre, las queries
      // atribuyen sus compras al mes calendario automáticamente.
      closingDay: data.kind === "debit" ? null : (data.closingDay ?? null),
      paymentDueDay: data.kind === "debit" ? null : (data.paymentDueDay ?? null),
    });

    updateTag(hhTag(household.id, "cards"));
    revalidatePath("/ajustes");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function updateCard(id: string, rawData: unknown): Promise<{ error?: string }> {
  try {
    const auth = await requireHousehold();
    if (!auth.ok) return { error: auth.error };
    const { household } = auth;

    const data = updateCardSchema.parse(rawData);

    await db
      .update(card)
      .set({
        name: data.name,
        lastFour: data.lastFour || null,
        kind: data.kind,
        color: data.color,
        creditLimit: data.creditLimit || null,
        closingDay: data.kind === "debit" ? null : (data.closingDay ?? null),
        paymentDueDay: data.kind === "debit" ? null : (data.paymentDueDay ?? null),
      })
      .where(and(eq(card.id, id), eq(card.householdId, household.id)));

    updateTag(hhTag(household.id, "cards"));
    revalidatePath("/ajustes");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function deleteCard(id: string): Promise<{ error?: string }> {
  try {
    const auth = await requireHousehold();
    if (!auth.ok) return { error: auth.error };
    const { household } = auth;

    await db
      .update(card)
      .set({ isActive: false })
      .where(and(eq(card.id, id), eq(card.householdId, household.id)));

    updateTag(hhTag(household.id, "cards"));
    revalidatePath("/ajustes");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al eliminar" };
  }
}
