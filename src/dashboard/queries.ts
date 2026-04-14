import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte, desc } from "drizzle-orm";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { aggregateTotals } from "@/dashboard/aggregation";
import {
  getActiveFixedExpenses,
  getPaymentsForCurrentMonth,
} from "@/gastos-fijos/queries";
import type {
  DashboardSummary,
  FixedBillWithStatus,
  ActiveInstallment,
} from "@/dashboard/types";

export async function getDashboardSummary(
  householdId: string,
  month: string
): Promise<DashboardSummary> {
  // fixedTotal: sum of amounts of active fixed expenses
  const fixedRows = await db
    .select({ amount: expense.amount })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "fixed"),
        eq(expense.isActive, true),
        isNull(expense.deletedAt)
      )
    );

  const fixedTotal = fixedRows.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  // installmentsTotal: sum of active installment amounts for this month
  // Filter in JS: installments_paid < installments_total
  const allInstallments = await db
    .select({
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "installment"),
        isNull(expense.deletedAt),
        lte(expense.startMonth, month)
      )
    );

  const installmentsTotal = allInstallments
    .filter(
      (row) =>
        (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
    )
    .reduce((acc, row) => acc + Number(row.installmentAmount ?? 0), 0);

  // oneTimeTotal: sum of one_time expenses for this period_month
  // expenseDate is YYYY-MM-DD — filter by month prefix YYYY-MM
  const monthPrefix = month.slice(0, 7); // 'YYYY-MM'
  const allOneTime = await db
    .select({ amount: expense.amount, expenseDate: expense.expenseDate })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "one_time"),
        isNull(expense.deletedAt)
      )
    );

  const oneTimeTotal = allOneTime
    .filter(
      (row) => row.expenseDate != null && row.expenseDate.startsWith(monthPrefix)
    )
    .reduce((acc, row) => acc + Number(row.amount ?? 0), 0);

  return aggregateTotals({ fixedTotal, installmentsTotal, oneTimeTotal });
}

export async function getFixedExpenseStatusThisMonth(
  householdId: string
): Promise<FixedBillWithStatus[]> {
  const expenses = await getActiveFixedExpenses(householdId);

  const results = await Promise.all(
    expenses.map(async (exp) => {
      const payments = await getPaymentsForCurrentMonth(exp.id);
      return {
        id: exp.id,
        description: exp.description,
        amount: Number(exp.amount ?? 0),
        paid: payments.length > 0,
      };
    })
  );

  return results;
}

export async function getActiveInstallments(
  householdId: string,
  month: string
): Promise<ActiveInstallment[]> {
  const rows = await db
    .select({
      id: expense.id,
      description: expense.description,
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "installment"),
        isNull(expense.deletedAt),
        lte(expense.startMonth, month)
      )
    );

  return rows
    .filter(
      (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
    )
    .map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.installmentAmount ?? 0),
      installmentsPaid: row.installmentsPaid ?? 0,
      installmentsTotal: row.installmentsTotal ?? 0,
    }));
}

export async function getRecentPurchases(
  householdId: string,
  limit = 5
): Promise<
  { id: string; description: string; amount: number; expenseDate: string | null }[]
> {
  const rows = await db
    .select({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "one_time"),
        isNull(expense.deletedAt)
      )
    )
    .orderBy(desc(expense.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount ?? 0),
  }));
}
