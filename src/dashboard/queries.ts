import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte, gte, lt, desc, inArray } from "drizzle-orm";
import { getMonthlyIncomeTotal, getMyMonthlyIncomeTotal } from "@/ingresos/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { aggregateTotals } from "@/dashboard/aggregation";
import {
  getActiveFixedExpenses,
  getAllFixedPaymentsForPeriod,
} from "@/gastos-fijos/queries";
import { getNextMonth, monthToDate } from "@/resumen/month-utils";
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
        inArray(expense.type, ["fixed", "variable"]),
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

  const [incomeTotal, myIncomeTotal] = await Promise.all([
    getMonthlyIncomeTotal(householdId, month),
    getMyMonthlyIncomeTotal(householdId, userId, month),
  ]);
  const myShareTotal = myShareFixed + myShareInstallments + myShareOneTime;
  const mySaldo = myIncomeTotal - myShareTotal;

  return {
    ...aggregateTotals({ fixedTotal, installmentsTotal, oneTimeTotal, incomeTotal }),
    myShareTotal,
    myShareFixed,
    myShareInstallments,
    myShareOneTime,
    myIncomeTotal,
    mySaldo,
  };
}

export async function getFixedExpenseStatusThisMonth(
  householdId: string,
  month: string
): Promise<FixedBillWithStatus[]> {
  const [expenses, payments] = await Promise.all([
    getActiveFixedExpenses(householdId),
    getAllFixedPaymentsForPeriod(householdId, month),
  ]);

  const paidIds = new Set(payments.map((p) => p.payment.expenseId));

  return expenses.map((exp) => ({
    id: exp.id,
    description: exp.description,
    amount: Number(exp.amount ?? 0),
    paid: paidIds.has(exp.id),
    responsibleId: exp.responsibleId ?? null,
    isShared: exp.isShared,
  }));
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
  const nextMonthDate = monthToDate(getNextMonth(month.slice(0, 7)));

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
        isNull(expense.deletedAt),
        gte(expense.expenseDate, month),
        lt(expense.expenseDate, nextMonthDate)
      )
    )
    .orderBy(desc(expense.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount ?? 0),
    expenseDate: row.expenseDate ?? null,
    responsibleId: row.responsibleId ?? null,
  }));
}
