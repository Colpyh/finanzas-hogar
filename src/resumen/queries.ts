import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment, category } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { visibleToUser } from "@/shared/lib/db/visibility";
import { aggregateTotals, calcPercentage } from "@/dashboard/aggregation";
import type {
  MonthlySummary,
  FixedVsVariableBreakdown,
  InstallmentBurden,
} from "@/resumen/types";

export async function getMonthlySummary(
  householdId: string,
  month: string,
  userId: string
): Promise<MonthlySummary> {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "expenses"), hhTag(householdId, "payments"), hhTag(householdId, "categories"))
  const monthPrefix = month.slice(0, 7); // 'YYYY-MM'

  // Las cuatro queries son independientes — en paralelo (antes: 5 secuenciales,
  // con la de cuotas duplicada).
  const [fixedPaymentRows, allInstallments, allOneTime, allCategories] = await Promise.all([
    // fixedTotal: sum of actual payments made for this specific month
    // (join a expense solo para poder filtrar gastos privados de otro miembro)
    db
      .select({ amount: fixedExpensePayment.amount })
      .from(fixedExpensePayment)
      .innerJoin(expense, eq(fixedExpensePayment.expenseId, expense.id))
      .where(
        and(
          eq(fixedExpensePayment.householdId, householdId),
          eq(fixedExpensePayment.periodMonth, month),
          visibleToUser(userId)
        )
      ),
    // installments: activas este mes (con categoría, para byCategory)
    db
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
          lte(expense.startMonth, month),
          visibleToUser(userId)
        )
      ),
    // oneTime: sum of one_time expenses for this period_month
    db
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
          isNull(expense.deletedAt),
          visibleToUser(userId)
        )
      ),
    // category names and budgets (solo las del hogar)
    db
      .select({ id: category.id, name: category.name, monthlyBudget: category.monthlyBudget })
      .from(category)
      .where(eq(category.householdId, householdId)),
  ]);

  const fixedTotal = fixedPaymentRows.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  const activeInstallmentsFiltered = allInstallments.filter(
    (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
  );
  const installmentsTotal = activeInstallmentsFiltered.reduce(
    (acc, row) => acc + Number(row.installmentAmount ?? 0),
    0
  );

  const filteredOneTime = allOneTime.filter(
    (row) => row.expenseDate != null && row.expenseDate.startsWith(monthPrefix)
  );

  const oneTimeTotal = filteredOneTime.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const categoryBudgetMap = new Map(allCategories.map((c) => [c.id, c.monthlyBudget]));

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
    .map(([categoryId, total]) => {
      const rawBudget = categoryBudgetMap.get(categoryId);
      return {
        categoryId,
        categoryName: categoryMap.get(categoryId) ?? "Sin categoría",
        total,
        budget: rawBudget != null ? Number(rawBudget) : null,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    ...aggregateTotals({ fixedTotal, installmentsTotal, oneTimeTotal, incomeTotal: 0 }),
    byCategory,
  };
}

export async function getFixedVsVariableBreakdown(
  householdId: string,
  month: string,
  userId: string
): Promise<FixedVsVariableBreakdown> {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "expenses"), hhTag(householdId, "payments"))
  const monthPrefix = month.slice(0, 7);

  const [fixedPaymentRows, allInstallments, allOneTime] = await Promise.all([
    // Fixed = sum of fixed_expense_payment.amount WHERE period_month = month (Scenario 5.2)
    // (join a expense solo para poder filtrar gastos privados de otro miembro)
    db
      .select({ amount: fixedExpensePayment.amount })
      .from(fixedExpensePayment)
      .innerJoin(expense, eq(fixedExpensePayment.expenseId, expense.id))
      .where(
        and(
          eq(fixedExpensePayment.householdId, householdId),
          eq(fixedExpensePayment.periodMonth, month),
          visibleToUser(userId)
        )
      ),
    // installmentsTotal for the month
    db
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
          lte(expense.startMonth, month),
          visibleToUser(userId)
        )
      ),
    // oneTimeTotal
    db
      .select({ amount: expense.amount, expenseDate: expense.expenseDate })
      .from(expense)
      .where(
        and(
          eq(expense.householdId, householdId),
          eq(expense.type, "one_time"),
          isNull(expense.deletedAt),
          visibleToUser(userId)
        )
      ),
  ]);

  const fixedAmount = fixedPaymentRows.reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0
  );

  const installmentsAmount = allInstallments
    .filter((row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0))
    .reduce((acc, row) => acc + Number(row.installmentAmount ?? 0), 0);

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
  month: string,
  userId: string
): Promise<InstallmentBurden> {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "expenses"))
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
        lte(expense.startMonth, month),
        visibleToUser(userId)
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
