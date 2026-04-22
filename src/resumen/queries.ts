import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment, category } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte, sql } from "drizzle-orm";
import { aggregateTotals, calcPercentage } from "@/dashboard/aggregation";
import type {
  MonthlySummary,
  FixedVsVariableBreakdown,
  InstallmentBurden,
} from "@/resumen/types";

export async function getMonthlySummary(
  householdId: string,
  month: string
): Promise<MonthlySummary> {
  const monthPrefix = month.slice(0, 7); // 'YYYY-MM'

  // fixedTotal: sum of actual payments made for this specific month
  const fixedPaymentRows = await db
    .select({ amount: fixedExpensePayment.amount })
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.householdId, householdId),
        eq(fixedExpensePayment.periodMonth, month)
      )
    );
  const fixedTotal = fixedPaymentRows.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  // installmentsTotal: sum of active installment amounts for this month
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
    .filter((row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0))
    .reduce((acc, row) => acc + Number(row.installmentAmount ?? 0), 0);

  // oneTimeTotal: sum of one_time expenses for this period_month
  const allOneTime = await db
    .select({
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      categoryId: expense.categoryId,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "one_time"),
        isNull(expense.deletedAt)
      )
    );

  const filteredOneTime = allOneTime.filter(
    (row) => row.expenseDate != null && row.expenseDate.startsWith(monthPrefix)
  );

  const oneTimeTotal = filteredOneTime.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  // byCategory: group one_time + installment expenses by category
  // Fetch category names
  const allCategories = await db
    .select({ id: category.id, name: category.name })
    .from(category);

  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

  // Collect all variable expenses with category
  const activeInstallments = await db
    .select({
      categoryId: expense.categoryId,
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

  const activeInstallmentsFiltered = activeInstallments.filter(
    (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
  );

  const byCategoryMap = new Map<string, number>();

  for (const row of filteredOneTime) {
    const prev = byCategoryMap.get(row.categoryId) ?? 0;
    byCategoryMap.set(row.categoryId, prev + Number(row.amount ?? 0));
  }

  for (const row of activeInstallmentsFiltered) {
    const prev = byCategoryMap.get(row.categoryId) ?? 0;
    byCategoryMap.set(row.categoryId, prev + Number(row.installmentAmount ?? 0));
  }

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) ?? "Sin categoría",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    ...aggregateTotals({ fixedTotal, installmentsTotal, oneTimeTotal, incomeTotal: 0 }),
    byCategory,
  };
}

export async function getFixedVsVariableBreakdown(
  householdId: string,
  month: string
): Promise<FixedVsVariableBreakdown> {
  const monthPrefix = month.slice(0, 7);

  // Fixed = sum of fixed_expense_payment.amount WHERE period_month = month (Scenario 5.2)
  const fixedPaymentRows = await db
    .select({ amount: fixedExpensePayment.amount })
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.householdId, householdId),
        eq(fixedExpensePayment.periodMonth, month)
      )
    );
  const fixedAmount = fixedPaymentRows.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  // installmentsTotal for the month
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

  const installmentsAmount = allInstallments
    .filter((row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0))
    .reduce((acc, row) => acc + Number(row.installmentAmount ?? 0), 0);

  // oneTimeTotal
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

  const variableAmount = oneTimeTotal + installmentsAmount;
  const grandTotal = fixedAmount + variableAmount;

  return {
    fixedAmount,
    fixedPct: calcPercentage(fixedAmount, grandTotal),
    variableAmount,
    variablePct: calcPercentage(variableAmount, grandTotal),
    installmentsAmount,
    installmentsPct: calcPercentage(installmentsAmount, grandTotal),
  };
}

export async function getInstallmentBurden(
  householdId: string,
  month: string
): Promise<InstallmentBurden> {
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

  const active = rows.filter(
    (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
  );

  const monthlyLockIn = active.reduce(
    (acc, row) => acc + Number(row.installmentAmount ?? 0),
    0
  );

  return {
    monthlyLockIn,
    installments: active.map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.installmentAmount ?? 0),
      remaining: (row.installmentsTotal ?? 0) - (row.installmentsPaid ?? 0),
    })),
  };
}
