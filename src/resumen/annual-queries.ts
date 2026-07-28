import { db } from "@/shared/lib/db";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { expense, income, card, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { elapsedMonths } from "./month-utils";
import { effectiveBillingMonth } from "@/shared/lib/billing";
import { getHouseholdMembers } from "@/household/queries";
import { getSharedInstallmentsPaidCounts, effectiveInstallmentsPaid } from "@/shared/lib/db/installments";

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
  cacheTag(householdId, hhTag(householdId, "expenses"), hhTag(householdId, "income"), hhTag(householdId, "cards"), hhTag(householdId, "payments"));

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

  // Fijos + variables: el monto REAL de cada mes vive en los pagos registrados
  // (fixed_expense_payment.periodMonth), igual que getMonthlySummary. Así el
  // gráfico varía mes a mes e incluye los variables (luz/agua/gas, cuyo
  // expense.amount es 0). El enfoque viejo — total fijo activo, constante para
  // los 12 meses y sin variables — dejaba las barras chatas e iguales.
  const paymentRows = await db
    .select({ periodMonth: fixedExpensePayment.periodMonth, amount: fixedExpensePayment.amount })
    .from(fixedExpensePayment)
    .where(eq(fixedExpensePayment.householdId, householdId));

  const paidByMonth = new Map<string, number>();
  for (const r of paymentRows) {
    if (!r.periodMonth) continue;
    paidByMonth.set(r.periodMonth, (paidByMonth.get(r.periodMonth) ?? 0) + Number(r.amount ?? 0));
  }

  // Active installments per month
  const installmentRows = await db
    .select({
      id: expense.id,
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
      startMonth: expense.startMonth,
      isShared: expense.isShared,
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

  const hasSharedInstallments = installmentRows.some((row) => row.isShared);
  const sharedInstallmentCounts = hasSharedInstallments
    ? await getSharedInstallmentsPaidCounts(householdId, (await getHouseholdMembers(householdId)).length)
    : new Map<string, number>();

  // Income: los sueldos (type=salary) se cargan una vez y se propagan hacia
  // adelante (el más reciente por miembro con periodMonth <= mes); los ingresos
  // puntuales (type=other) cuentan solo su mes exacto. Misma lógica que
  // getMonthlyIncome — sin esto, el ingreso aparecía solo el mes en que se cargó.
  const incomeRows = await db
    .select({
      type: income.type,
      memberId: income.memberId,
      amount: income.amount,
      periodMonth: income.periodMonth,
      createdAt: income.createdAt,
    })
    .from(income)
    .where(eq(income.householdId, householdId));

  function incomeForMonth(month: string): number {
    const latestSalaryByMember = new Map<string, (typeof incomeRows)[number]>();
    for (const r of incomeRows) {
      if (r.type !== "salary" || !r.periodMonth || r.periodMonth > month) continue;
      const existing = latestSalaryByMember.get(r.memberId);
      if (
        !existing ||
        r.periodMonth > existing.periodMonth! ||
        (r.periodMonth === existing.periodMonth && r.createdAt > existing.createdAt)
      ) {
        latestSalaryByMember.set(r.memberId, r);
      }
    }
    let total = 0;
    for (const r of latestSalaryByMember.values()) total += Number(r.amount ?? 0);
    for (const r of incomeRows) {
      if (r.type === "other" && r.periodMonth === month) total += Number(r.amount ?? 0);
    }
    return total;
  }

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
        const paid = effectiveInstallmentsPaid(r, sharedInstallmentCounts);
        const total = r.installmentsTotal ?? 0;
        const elapsed = elapsedMonths(r.startMonth, month);
        return elapsed < total && paid < total;
      })
      .reduce((acc, r) => acc + Number(r.installmentAmount ?? 0), 0);

    const fixedPaid = paidByMonth.get(month) ?? 0;

    return {
      month,
      label: toLabel(month),
      expenses: fixedPaid + installments + oneTime,
      income: incomeForMonth(month),
    };
  });
}
