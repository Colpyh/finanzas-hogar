import { db } from "@/shared/lib/db";
import { income } from "@/shared/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";

/**
 * Returns income rows for a given month:
 * - type='other': exact periodMonth match (one-time)
 * - type='salary': the most recent row per member where periodMonth <= month (recurring)
 *
 * This means a salary entered once propagates forward automatically.
 * Entering a new salary for a later month replaces it going forward.
 */
export async function getMonthlyIncome(householdId: string, periodMonth: string) {
  const allRows = await db
    .select()
    .from(income)
    .where(
      and(
        eq(income.householdId, householdId),
        lte(income.periodMonth, periodMonth)      // include past salaries too
      )
    )
    .orderBy(income.periodMonth, income.createdAt);

  // one-time income: only exact month
  const otherRows = allRows.filter(
    (r) => r.type === "other" && r.periodMonth === periodMonth
  );

  // salary: most recent per member where periodMonth <= queried month
  const salaryRows = allRows.filter((r) => r.type === "salary");
  const latestSalaryByMember = new Map<string, typeof salaryRows[0]>();
  for (const row of salaryRows) {
    const existing = latestSalaryByMember.get(row.memberId);
    if (
      !existing ||
      row.periodMonth > existing.periodMonth ||
      (row.periodMonth === existing.periodMonth && row.createdAt > existing.createdAt)
    ) {
      latestSalaryByMember.set(row.memberId, row);
    }
  }

  return [...Array.from(latestSalaryByMember.values()), ...otherRows];
}

export async function getMonthlyIncomeTotal(
  householdId: string,
  periodMonth: string
): Promise<number> {
  const rows = await getMonthlyIncome(householdId, periodMonth);
  return rows.reduce((acc, r) => acc + Number(r.amount), 0);
}

/**
 * Returns income total for a specific member (salary recurring + one-time for the month).
 */
export async function getMyMonthlyIncomeTotal(
  householdId: string,
  memberId: string,
  periodMonth: string
): Promise<number> {
  const allRows = await getMonthlyIncome(householdId, periodMonth);
  return allRows
    .filter((r) => r.memberId === memberId)
    .reduce((acc, r) => acc + Number(r.amount), 0);
}
