import { db } from "@/shared/lib/db";
import { category, expense, card } from "@/shared/lib/db/schema";
import { or, isNull, isNotNull, eq, and, asc, inArray, lte } from "drizzle-orm";
import type { CategoryBudgetStatus } from "@/dashboard/types";
import { effectiveBillingMonth } from "@/shared/lib/billing";

export async function getCategories(householdId: string) {
  return db
    .select()
    .from(category)
    .where(or(isNull(category.householdId), eq(category.householdId, householdId)))
    .orderBy(asc(category.name));
}

export async function getCategoryBudgetStatus(
  householdId: string,
  month: string
): Promise<CategoryBudgetStatus[]> {
  const monthPrefix = month.slice(0, 7);

  const budgetCategories = await db
    .select()
    .from(category)
    .where(
      and(
        or(isNull(category.householdId), eq(category.householdId, householdId)),
        isNotNull(category.monthlyBudget)
      )
    )
    .orderBy(asc(category.name));

  if (budgetCategories.length === 0) return [];
  const categoryIds = budgetCategories.map((c) => c.id);

  const [oneTimeRows, fixedRows, installmentRows] = await Promise.all([
    db
      .select({ amount: expense.amount, categoryId: expense.categoryId, expenseDate: expense.expenseDate, closingDay: card.closingDay })
      .from(expense)
      .leftJoin(card, eq(expense.cardId, card.id))
      .where(
        and(
          eq(expense.householdId, householdId),
          eq(expense.type, "one_time"),
          isNull(expense.deletedAt),
          inArray(expense.categoryId, categoryIds)
        )
      ),
    db
      .select({ amount: expense.amount, categoryId: expense.categoryId })
      .from(expense)
      .where(
        and(
          eq(expense.householdId, householdId),
          inArray(expense.type, ["fixed", "variable"]),
          eq(expense.isActive, true),
          isNull(expense.deletedAt),
          inArray(expense.categoryId, categoryIds)
        )
      ),
    db
      .select({
        installmentAmount: expense.installmentAmount,
        installmentsPaid: expense.installmentsPaid,
        installmentsTotal: expense.installmentsTotal,
        categoryId: expense.categoryId,
      })
      .from(expense)
      .where(
        and(
          eq(expense.householdId, householdId),
          eq(expense.type, "installment"),
          isNull(expense.deletedAt),
          lte(expense.startMonth, month),
          inArray(expense.categoryId, categoryIds)
        )
      ),
  ]);

  const spentMap: Record<string, number> = {};

  for (const r of oneTimeRows) {
    if (!r.categoryId || !r.expenseDate) continue;
    const effectiveMonth = r.closingDay != null
      ? effectiveBillingMonth(r.expenseDate, r.closingDay)
      : r.expenseDate.slice(0, 7);
    if (effectiveMonth === monthPrefix) {
      spentMap[r.categoryId] = (spentMap[r.categoryId] ?? 0) + Number(r.amount ?? 0);
    }
  }
  for (const r of fixedRows) {
    if (r.categoryId) {
      spentMap[r.categoryId] = (spentMap[r.categoryId] ?? 0) + Number(r.amount ?? 0);
    }
  }
  for (const r of installmentRows) {
    if (r.categoryId && (r.installmentsPaid ?? 0) < (r.installmentsTotal ?? 0)) {
      spentMap[r.categoryId] = (spentMap[r.categoryId] ?? 0) + Number(r.installmentAmount ?? 0);
    }
  }

  return budgetCategories
    .map((cat) => {
      const budget = Number(cat.monthlyBudget ?? 0);
      const spent = spentMap[cat.id] ?? 0;
      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon ?? null,
        color: cat.color ?? null,
        monthlyBudget: budget,
        spent,
        percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
      };
    })
    .filter((c) => c.monthlyBudget > 0)
    .sort((a, b) => b.percentage - a.percentage);
}
