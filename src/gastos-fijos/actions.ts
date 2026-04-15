"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import {
  createFixedExpenseSchema,
  markPaidSchema,
  updateFixedExpenseSchema,
} from "./types";

export async function createFixedExpense(rawData: unknown) {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const data = createFixedExpenseSchema.parse(rawData);

  const [created] = await db
    .insert(expense)
    .values({
      ...data,
      type: "fixed",
      householdId: household.id,
      createdBy: user.id,
      isActive: true,
      isShared: data.isShared,
      responsibleId: data.responsibleId ?? null,
    })
    .returning();

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  redirect("/gastos-fijos");
}

export async function markFixedExpensePaid(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const data = markPaidSchema.parse(rawData);
  const periodMonth = currentPeriodMonth();

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId: data.expenseId,
      householdId: household.id,
      paidBy: user.id,
      periodMonth,
      amount: data.amount,
      status: data.status,
      notes: data.notes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "Ya confirmaste tu pago este mes" };
    }
    throw err;
  }

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  return {};
}

export async function upgradeToPaid(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const periodMonth = currentPeriodMonth();

  try {
    await db
      .update(fixedExpensePayment)
      .set({ status: "paid", paidAt: new Date() })
      .where(
        and(
          eq(fixedExpensePayment.expenseId, expenseId),
          eq(fixedExpensePayment.periodMonth, periodMonth),
          eq(fixedExpensePayment.paidBy, user.id)
        )
      );
  } catch {
    return { error: "No se pudo actualizar el pago" };
  }

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  return {};
}

export async function toggleFixedExpenseActive(expenseId: string): Promise<void> {
  const user = await getUser();

  const [current] = await db
    .select({ isActive: expense.isActive })
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!current) throw new Error("Expense not found");

  await db
    .update(expense)
    .set({ isActive: !current.isActive })
    .where(eq(expense.id, expenseId));

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
}

export async function updateFixedExpense(expenseId: string, rawData: unknown) {
  await getUser();
  const data = updateFixedExpenseSchema.parse(rawData);

  const [updated] = await db
    .update(expense)
    .set(data)
    .where(eq(expense.id, expenseId))
    .returning();

  revalidatePath("/gastos-fijos");
  return updated;
}

export async function deleteFixedExpense(expenseId: string): Promise<void> {
  await getUser();

  await db
    .update(expense)
    .set({ deletedAt: new Date() })
    .where(eq(expense.id, expenseId));

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
}
