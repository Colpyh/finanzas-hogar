import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { visibleToUser } from "@/shared/lib/db/visibility";

export type FixedExpensePayment = InferSelectModel<typeof fixedExpensePayment>;

export async function getActiveFixedExpenses(householdId: string, userId: string) {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "expenses"))
  return db
    .select({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      type: expense.type,
      recurrenceDay: expense.recurrenceDay,
      isActive: expense.isActive,
      isShared: expense.isShared,
      responsibleId: expense.responsibleId,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        inArray(expense.type, ["fixed", "variable"]),
        eq(expense.isActive, true),
        isNull(expense.deletedAt),
        visibleToUser(userId)
      )
    );
}

export async function getFixedExpensePayments(expenseId: string, householdId: string) {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "payments"))
  return db
    .select()
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.householdId, householdId)
      )
    )
    .orderBy(fixedExpensePayment.periodMonth);
}

export async function getPaymentsForMonth(expenseId: string, periodMonth: string, householdId: string) {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "payments"))
  return db
    .select()
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.householdId, householdId),
        eq(fixedExpensePayment.periodMonth, periodMonth)
      )
    );
}

/** Trae todos los pagos del mes para todos los gastos fijos activos del hogar en una sola query. */
export async function getAllFixedPaymentsForPeriod(householdId: string, periodMonth: string) {
  'use cache'
  // Tagea payments (lee fixed_expense_payment) Y expenses (filtra por
  // expense.isActive/type/deletedAt vía el join) — así desactivar o borrar un
  // gasto fijo también invalida este resultado.
  cacheTag(householdId, hhTag(householdId, "payments"), hhTag(householdId, "expenses"))
  return db
    .select({ payment: fixedExpensePayment })
    .from(fixedExpensePayment)
    .innerJoin(expense, eq(fixedExpensePayment.expenseId, expense.id))
    .where(
      and(
        eq(expense.householdId, householdId),
        inArray(expense.type, ["fixed", "variable"]),
        eq(expense.isActive, true),
        isNull(expense.deletedAt),
        eq(fixedExpensePayment.periodMonth, periodMonth)
      )
    );
}
