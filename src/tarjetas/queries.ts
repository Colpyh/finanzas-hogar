import { db } from "@/shared/lib/db";
import { cacheTag } from "next/cache";
import { card, expense } from "@/shared/lib/db/schema";
import { eq, and, isNull, isNotNull, gte, lte } from "drizzle-orm";
import { billingPeriodForMonth } from "@/shared/lib/billing";

export type CardPaymentDue = {
  cardId: string;
  cardName: string;
  cardColor: string;
  cardLastFour: string | null;
  paymentDueDay: number;
  closingDay: number;
  billingStart: string; // YYYY-MM-DD
  billingEnd: string;   // YYYY-MM-DD
  amount: number;
};

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
 * Returns the card payment amounts due in `month` for cards that have billing
 * cycle dates configured (closingDay + paymentDueDay).
 *
 * Each result represents: "pay [amount] for [card] by day [paymentDueDay] of this month,
 * covering expenses from [billingStart] to [billingEnd]."
 */
export async function getCardPaymentsDue(
  householdId: string,
  month: string
): Promise<CardPaymentDue[]> {
  "use cache";
  cacheTag(householdId);

  const billingCards = await db
    .select()
    .from(card)
    .where(
      and(
        eq(card.householdId, householdId),
        eq(card.isActive, true),
        isNotNull(card.closingDay),
        isNotNull(card.paymentDueDay)
      )
    );

  if (billingCards.length === 0) return [];

  const cardIds = billingCards.map((c) => c.id);

  // Compute the overall date window to fetch expenses (covers all billing periods)
  const periods = billingCards.map((c) =>
    billingPeriodForMonth(month, c.closingDay!)
  );
  const windowStart = periods.map((p) => p.start).sort()[0]!;
  const windowEnd = periods.map((p) => p.end).sort().at(-1)!;

  const rows = await db
    .select({ amount: expense.amount, expenseDate: expense.expenseDate, cardId: expense.cardId })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        isNull(expense.deletedAt),
        // inArray would be ideal but not imported here — use filter in JS after broad fetch
        gte(expense.expenseDate, windowStart),
        lte(expense.expenseDate, windowEnd)
      )
    );

  // Only keep rows for billing cards
  const cardIdSet = new Set(cardIds);
  const cardRows = rows.filter((r) => r.cardId && cardIdSet.has(r.cardId));

  return billingCards
    .map((c) => {
      const { start, end } = billingPeriodForMonth(month, c.closingDay!);
      const amount = cardRows
        .filter(
          (r) =>
            r.cardId === c.id &&
            r.expenseDate &&
            r.expenseDate >= start &&
            r.expenseDate <= end
        )
        .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

      return {
        cardId: c.id,
        cardName: c.name,
        cardColor: c.color,
        cardLastFour: c.lastFour ?? null,
        paymentDueDay: c.paymentDueDay!,
        closingDay: c.closingDay!,
        billingStart: start,
        billingEnd: end,
        amount,
      };
    })
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.paymentDueDay - b.paymentDueDay);
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
