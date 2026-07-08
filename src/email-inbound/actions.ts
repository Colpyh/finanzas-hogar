"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
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
): Promise<void> {
  const parsed = confirmPendingExpenseSchema.parse(input);
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

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
      throw new Error("Pending expense not found or already processed");
    }
    if (pending.parsedAmount === null || pending.parsedDate === null) {
      throw new Error("Pending expense has no parsed amount or date");
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
    if (!created) throw new Error("Failed to insert expense");

    // Flip pending → confirmed
    await tx
      .update(pendingExpense)
      .set({ status: "confirmed", expenseId: created.id })
      .where(eq(pendingExpense.id, pending.id));
  });

  updateTag(household.id);
  revalidatePath("/gastos-pendientes");
  revalidatePath("/dashboard");
  revalidatePath("/compras");
}

export async function discardPendingExpense(
  input: DiscardPendingExpenseInput
): Promise<void> {
  const parsed = discardPendingExpenseSchema.parse(input);
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

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
    throw new Error("Pending expense not found or already processed");
  }

  updateTag(household.id);
  revalidatePath("/gastos-pendientes");
  revalidatePath("/dashboard");
}
