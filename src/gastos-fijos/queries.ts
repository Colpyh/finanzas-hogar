import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { cacheTag } from "next/cache";

export type FixedExpensePayment = InferSelectModel<typeof fixedExpensePayment>;

export async function getActiveFixedExpenses(householdId: string) {
  'use cache'
  cacheTag(householdId)
  return db
    .select()
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        inArray(expense.type, ["fixed", "variable"]),
        eq(expense.isActive, true),
        isNull(expense.deletedAt)
      )
    );
}

export async function getFixedExpensePayments(expenseId: string, householdId: string) {
  'use cache'
  cacheTag(householdId)
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
  cacheTag(householdId)
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
  cacheTag(householdId)
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
