"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { db } from "@/shared/lib/db";
import { pendingExpense, expense } from "@/shared/lib/db/schema";
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

  revalidatePath("/gastos-pendientes");
}
