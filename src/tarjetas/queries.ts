import { db } from "@/shared/lib/db";
import { card, expense } from "@/shared/lib/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

export async function getHouseholdCards(householdId: string) {
  return db
    .select()
    .from(card)
    .where(and(eq(card.householdId, householdId), eq(card.isActive, true)))
    .orderBy(card.createdAt);
}

/**
 * Returns how much has been charged to each card in a given month.
 * Counts: one_time (by expenseDate) + active installmentAmount + active fixed amount.
 */
export async function getCardUsageSummary(
  householdId: string,
  month: string
): Promise<Map<string, number>> {
  const monthPrefix = month.slice(0, 7);

  const rows = await db
    .select({
      cardId: expense.cardId,
      type: expense.type,
      amount: expense.amount,
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
      expenseDate: expense.expenseDate,
      startMonth: expense.startMonth,
      isActive: expense.isActive,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        isNull(expense.deletedAt),
        isNotNull(expense.cardId)
      )
    );

  const usage = new Map<string, number>();

  for (const row of rows) {
    if (!row.cardId) continue;
    let contribution = 0;

    if (row.type === "one_time" && row.expenseDate?.startsWith(monthPrefix)) {
      contribution = Number(row.amount ?? 0);
    } else if (
      row.type === "installment" &&
      row.startMonth &&
      row.startMonth <= month &&
      (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
    ) {
      const remaining = (row.installmentsTotal ?? 0) - (row.installmentsPaid ?? 0);
      contribution = remaining * Number(row.installmentAmount ?? 0);
    } else if (row.type === "fixed" && row.isActive) {
      contribution = Number(row.amount ?? 0);
    }

    if (contribution > 0) {
      usage.set(row.cardId, (usage.get(row.cardId) ?? 0) + contribution);
    }
  }

  return usage;
}

/**
 * Returns how many non-deleted expenses are linked to each card in the household.
 * Used to warn the user before deleting a card that has linked expenses.
 */
export async function getCardExpenseCounts(householdId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ cardId: expense.cardId })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        isNull(expense.deletedAt),
        isNotNull(expense.cardId)
      )
    );

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.cardId) continue;
    counts.set(row.cardId, (counts.get(row.cardId) ?? 0) + 1);
  }
  return counts;
}
