import "server-only";
import { db } from "@/shared/lib/db";
import { pendingExpense } from "@/shared/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export async function listPendingByHousehold(
  householdId: string,
  opts?: { limit?: number; offset?: number }
) {
  return db
    .select()
    .from(pendingExpense)
    .where(
      and(
        eq(pendingExpense.householdId, householdId),
        eq(pendingExpense.status, "pending")
      )
    )
    .orderBy(desc(pendingExpense.createdAt))
    .limit(opts?.limit ?? 1000)
    .offset(opts?.offset ?? 0);
}

export async function getPendingById(id: string, householdId: string) {
  const [row] = await db
    .select()
    .from(pendingExpense)
    .where(
      and(eq(pendingExpense.id, id), eq(pendingExpense.householdId, householdId))
    )
    .limit(1);
  return row ?? null;
}

export async function getPendingCount(householdId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pendingExpense)
    .where(
      and(
        eq(pendingExpense.householdId, householdId),
        eq(pendingExpense.status, "pending")
      )
    );
  return row?.count ?? 0;
}
