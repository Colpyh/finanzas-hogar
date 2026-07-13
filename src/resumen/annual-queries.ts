import { db } from "@/shared/lib/db";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { expense, income, card } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { elapsedMonths } from "./month-utils";
import { effectiveBillingMonth } from "@/shared/lib/billing";

export type MonthlyDataPoint = {
  month: string; // 'YYYY-MM-01'
  label: string; // 'Ene', 'Feb', ...
  expenses: number;
  income: number;
};

// Builds the 12-month window ending at `anchorMonth` ('YYYY-MM-01'). The anchor
// is passed in (not computed with `new Date()` here) so this stays usable inside
// a cached function — the date is resolved by the caller and becomes part of the
// cache key, keeping the window fresh when the month rolls over.
function last12Months(anchorMonth: string): string[] {
  const months: string[] = [];
  const [ay, am] = anchorMonth.split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ay!, am! - 1 - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}-01`);
  }
  return months;
}

const SHORT_MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function toLabel(monthStr: string): string {
  const mIdx = parseInt(monthStr.slice(5, 7)) - 1;
  return SHORT_MONTHS[mIdx] ?? monthStr.slice(5, 7);
}

export async function getAnnualSummary(
  householdId: string,
  anchorMonth: string
): Promise<MonthlyDataPoint[]> {
  "use cache";
  cacheTag(householdId, hhTag(householdId, "expenses"), hhTag(householdId, "income"), hhTag(householdId, "cards"));

  const months = last12Months(anchorMonth);
  const oldest = months[0]!;
  const newest = months[months.length - 1]!;
  const newestPrefix = newest.slice(0, 7);

  // One-time expenses per month, with card closingDay for billing attribution
  const oneTimeRows = await db
    .select({ amount: expense.amount, expenseDate: expense.expenseDate, closingDay: card.closingDay })
    .from(expense)
    .leftJoin(card, eq(expense.cardId, card.id))
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "one_time"),
        isNull(expense.deletedAt)
      )
    );

  // Fixed expenses (constant per month — use the active total)
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
  const fixedMonthly = fixedRows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

  // Active installments per month
  const installmentRows = await db
    .select({
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
      startMonth: expense.startMonth,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "installment"),
        isNull(expense.deletedAt),
        lte(expense.startMonth, newest)
      )
    );

  // Income per month
  const incomeRows = await db
    .select({ amount: income.amount, periodMonth: income.periodMonth })
    .from(income)
    .where(eq(income.householdId, householdId));

  return months.map((month) => {
    const prefix = month.slice(0, 7);

    const oneTime = oneTimeRows
      .filter((r) => {
        if (!r.expenseDate) return false;
        if (r.closingDay != null) {
          return effectiveBillingMonth(r.expenseDate, r.closingDay) === prefix;
        }
        return r.expenseDate.startsWith(prefix);
      })
      .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    const installments = installmentRows
      .filter((r) => {
        if (!r.startMonth) return false;
        if (r.startMonth > month) return false;
        const paid = r.installmentsPaid ?? 0;
        const total = r.installmentsTotal ?? 0;
        const elapsed = elapsedMonths(r.startMonth, month);
        return elapsed < total && paid < total;
      })
      .reduce((acc, r) => acc + Number(r.installmentAmount ?? 0), 0);

    const monthIncome = incomeRows
      .filter((r) => r.periodMonth?.startsWith(prefix))
      .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    return {
      month,
      label: toLabel(month),
      expenses: fixedMonthly + installments + oneTime,
      income: monthIncome,
    };
  });
}
