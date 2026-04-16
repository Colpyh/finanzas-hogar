import { db } from "@/shared/lib/db";
import { income } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getMonthlyIncome(householdId: string, periodMonth: string) {
  return db
    .select()
    .from(income)
    .where(
      and(eq(income.householdId, householdId), eq(income.periodMonth, periodMonth))
    )
    .orderBy(income.createdAt);
}

export async function getMonthlyIncomeTotal(
  householdId: string,
  periodMonth: string
): Promise<number> {
  const rows = await getMonthlyIncome(householdId, periodMonth);
  return rows.reduce((acc, r) => acc + Number(r.amount), 0);
}
