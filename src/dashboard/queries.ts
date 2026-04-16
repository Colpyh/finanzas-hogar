import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte, desc } from "drizzle-orm";
import { getMonthlyIncomeTotal } from "@/ingresos/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { aggregateTotals } from "@/dashboard/aggregation";
import {
  getActiveFixedExpenses,
  getPaymentsForMonth,
} from "@/gastos-fijos/queries";
import type {
  DashboardSummary,
  FixedBillWithStatus,
  ActiveInstallment,
  RecentPurchase,
} from "@/dashboard/types";

function myShare(amount: number, responsibleId: string | null, userId: string): number {
  if (responsibleId === userId) return amount;
  if (responsibleId === null) return amount / 2;
  return 0;
}

export async function getDashboardSummary(
  householdId: string,
  userId: string,
  month: string
): Promise<DashboardSummary> {
  // fixedTotal: sum of amounts of active fixed expenses
  const fixedRows = await db
    .select({ amount: expense.amount, responsibleId: expense.responsibleId, isShared: expense.isShared })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "fixed"),
        eq(expense.isActive, true),
        isNull(expense.deletedAt)
      )
    );

  const fixedTotal = fixedRows.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
  const myShareFixed = fixedRows.reduce((acc, row) => {
    const amount = Number(row.amount ?? 0);
    // Shared expense: cost is always split 50/50 regardless of who physically pays
    if (row.isShared) return acc + amount / 2;
    return acc + myShare(amount, row.responsibleId, userId);
  }, 0);

  // installmentsTotal: sum of active installment amounts for this month
  const allInstallments = await db
    .select({
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
      responsibleId: expense.responsibleId,
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

  const activeInstallments = allInstallments.filter(
    (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
  );
  const installmentsTotal = activeInstallments.reduce(
    (acc, row) => acc + Number(row.installmentAmount ?? 0),
    0
  );
  const myShareInstallments = activeInstallments.reduce(
    (acc, row) => acc + myShare(Number(row.installmentAmount ?? 0), row.responsibleId, userId),
    0
  );

  // oneTimeTotal: sum of one_time expenses for this period_month
  const monthPrefix = month.slice(0, 7);
  const allOneTime = await db
    .select({
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      responsibleId: expense.responsibleId,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "one_time"),
        isNull(expense.deletedAt)
      )
    );

  const thisMonthOneTime = allOneTime.filter(
    (row) => row.expenseDate != null && row.expenseDate.startsWith(monthPrefix)
  );
  const oneTimeTotal = thisMonthOneTime.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );
  const myShareOneTime = thisMonthOneTime.reduce(
    (acc, row) => acc + myShare(Number(row.amount ?? 0), row.responsibleId, userId),
    0
  );

  const incomeTotal = await getMonthlyIncomeTotal(householdId, month);
  const myShareTotal = myShareFixed + myShareInstallments + myShareOneTime;

  return {
    ...aggregateTotals({ fixedTotal, installmentsTotal, oneTimeTotal, incomeTotal }),
    myShareTotal,
    myShareFixed,
    myShareInstallments,
    myShareOneTime,
  };
}

export async function getFixedExpenseStatusThisMonth(
  householdId: string,
  month: string
): Promise<FixedBillWithStatus[]> {
  const expenses = await getActiveFixedExpenses(householdId);

  const results = await Promise.all(
    expenses.map(async (exp) => {
      const payments = await getPaymentsForMonth(exp.id, month);
      return {
        id: exp.id,
        description: exp.description,
        amount: Number(exp.amount ?? 0),
        paid: payments.length > 0,
        responsibleId: exp.responsibleId ?? null,
        isShared: exp.isShared,
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
      responsibleId: expense.responsibleId,
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
      responsibleId: row.responsibleId ?? null,
    }));
}

export async function getRecentPurchases(
  householdId: string,
  month: string,
  limit = 5
): Promise<RecentPurchase[]> {
  const monthPrefix = month.slice(0, 7);

  const rows = await db
    .select({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      responsibleId: expense.responsibleId,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "one_time"),
        isNull(expense.deletedAt)
      )
    )
    .orderBy(desc(expense.createdAt));

  const filtered = rows.filter(
    (r) => r.expenseDate != null && r.expenseDate.startsWith(monthPrefix)
  );

  return filtered.slice(0, limit).map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount ?? 0),
    expenseDate: row.expenseDate ?? null,
    responsibleId: row.responsibleId ?? null,
  }));
}
