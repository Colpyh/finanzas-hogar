import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";

export async function getActiveFixedExpenses(householdId: string) {
  return db
    .select()
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "fixed"),
        eq(expense.isActive, true),
        isNull(expense.deletedAt)
      )
    );
}

export async function getFixedExpensePayments(expenseId: string) {
  return db
    .select()
    .from(fixedExpensePayment)
    .where(eq(fixedExpensePayment.expenseId, expenseId))
    .orderBy(fixedExpensePayment.periodMonth);
}

export async function getPaymentsForCurrentMonth(expenseId: string) {
  const periodMonth = currentPeriodMonth();
  return db
    .select()
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.periodMonth, periodMonth)
      )
    );
}
