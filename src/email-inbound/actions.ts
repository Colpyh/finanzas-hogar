"use server";

import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { requireHousehold } from "@/household/guards";
import { db } from "@/shared/lib/db";
import { pendingExpense, expense, card } from "@/shared/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  confirmPendingExpenseSchema,
  discardPendingExpenseSchema,
  type ConfirmPendingExpenseInput,
  type DiscardPendingExpenseInput,
} from "./types";

export async function confirmPendingExpense(
  input: ConfirmPendingExpenseInput
): Promise<{ error?: string }> {
  let parsed: ConfirmPendingExpenseInput;
  try {
    parsed = confirmPendingExpenseSchema.parse(input);
  } catch {
    return { error: "Datos inválidos" };
  }
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { user, household } = auth;

  // Los throw DENTRO de la transacción son el mecanismo de rollback de
  // Drizzle — se capturan afuera y se traducen a {error} para el caller.
  try {
    await db.transaction(async (tx) => {
      // Fetch pending with household + status guard
      const [pending] = await tx
        .select()
        .from(pendingExpense)
        .where(
          and(
            eq(pendingExpense.id, parsed.pendingExpenseId),
            eq(pendingExpense.householdId, household.id),
            eq(pendingExpense.status, "pending")
          )
        )
        .limit(1);

      if (!pending) {
        throw new Error("Este gasto pendiente ya fue procesado o no existe");
      }
      if (pending.parsedAmount === null || pending.parsedDate === null) {
        throw new Error("Este gasto pendiente no tiene monto o fecha detectados");
      }

      // Auto-vincular la tarjeta por los últimos 4 dígitos del correo del banco,
      // solo si hay exactamente UNA tarjeta activa con ese last4 (sin ambigüedad).
      let matchedCardId: string | undefined;
      if (pending.parsedCardLast4) {
        const matches = await tx
          .select({ id: card.id })
          .from(card)
          .where(
            and(
              eq(card.householdId, household.id),
              eq(card.isActive, true),
              eq(card.lastFour, pending.parsedCardLast4)
            )
          )
          .limit(2);
        if (matches.length === 1) matchedCardId = matches[0]!.id;
      }

      // Create the expense
      const inserted = await tx
        .insert(expense)
        .values({
          householdId: household.id,
          createdBy: user.id,
          categoryId: parsed.categoryId,
          type: "one_time",
          description: parsed.description,
          amount: pending.parsedAmount,
          currency: "CLP",
          expenseDate: pending.parsedDate,
          ...(matchedCardId ? { cardId: matchedCardId } : {}),
        })
        .returning({ id: expense.id });

      const created = inserted[0];
      if (!created) throw new Error("No se pudo crear el gasto");

      // Flip pending → confirmed
      await tx
        .update(pendingExpense)
        .set({ status: "confirmed", expenseId: created.id })
        .where(eq(pendingExpense.id, pending.id));
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo confirmar el gasto" };
  }

  updateTag(hhTag(household.id, "expenses"));
  updateTag(hhTag(household.id, "pending"));
  revalidatePath("/gastos-pendientes");
  return {};
}

export async function discardPendingExpense(
  input: DiscardPendingExpenseInput
): Promise<{ error?: string }> {
  let parsed: DiscardPendingExpenseInput;
  try {
    parsed = discardPendingExpenseSchema.parse(input);
  } catch {
    return { error: "Datos inválidos" };
  }
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { household } = auth;

  const result = await db
    .update(pendingExpense)
    .set({ status: "discarded" })
    .where(
      and(
        eq(pendingExpense.id, parsed.pendingExpenseId),
        eq(pendingExpense.householdId, household.id),
        eq(pendingExpense.status, "pending")
      )
    )
    .returning({ id: pendingExpense.id });

  if (result.length === 0) {
    return { error: "Este gasto pendiente ya fue procesado o no existe" };
  }

  updateTag(hhTag(household.id, "pending"));
  revalidatePath("/gastos-pendientes");
  return {};
}
