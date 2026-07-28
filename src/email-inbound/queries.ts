import "server-only";
import { cacheTag } from "next/cache";
import { db } from "@/shared/lib/db";
import { pendingExpense, expense } from "@/shared/lib/db/schema";
import { and, desc, eq, sql, inArray, isNull, getTableColumns } from "drizzle-orm";
import { hhTag } from "@/shared/lib/cache-tags";

/** Normaliza un merchant/descripción para comparar: minúsculas, sin espacios extra. */
export function normalizeMerchant(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function listPendingByHousehold(
  householdId: string,
  userId: string,
  opts?: { limit?: number; offset?: number }
) {
  const { rawPayload, ...cols } = getTableColumns(pendingExpense);
  void rawPayload; // excluded — too large and not needed in the UI
  return db
    .select(cols)
    .from(pendingExpense)
    .where(
      and(
        eq(pendingExpense.householdId, householdId),
        eq(pendingExpense.status, "pending"),
        eq(pendingExpense.createdByUserId, userId)
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

/**
 * Sugiere una categoría por merchant a partir del historial de gastos del hogar.
 * Para cada merchant devuelve la categoría con la que se clasificó más veces un
 * gasto de esa misma descripción (match exacto normalizado). Si un merchant no
 * tiene historial, simplemente no aparece en el resultado (sin sugerencia).
 */
export async function suggestCategoryByMerchant(
  householdId: string,
  merchants: string[]
): Promise<Record<string, string>> {
  const normalized = [...new Set(merchants.map(normalizeMerchant).filter(Boolean))];
  if (normalized.length === 0) return {};

  const key = sql<string>`lower(regexp_replace(trim(${expense.description}), '\s+', ' ', 'g'))`;

  const rows = await db
    .select({
      merchant: key,
      categoryId: expense.categoryId,
      n: sql<number>`count(*)::int`,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        isNull(expense.deletedAt),
        inArray(key, normalized)
      )
    )
    .groupBy(key, expense.categoryId)
    .orderBy(desc(sql`count(*)`));

  // rows viene ordenado por count desc → el primero por merchant es el ganador.
  const best: Record<string, string> = {};
  for (const row of rows) {
    if (!(row.merchant in best)) best[row.merchant] = row.categoryId;
  }
  return best;
}

export async function getPendingCount(householdId: string, userId: string): Promise<number> {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "pending"))
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pendingExpense)
    .where(
      and(
        eq(pendingExpense.householdId, householdId),
        eq(pendingExpense.status, "pending"),
        eq(pendingExpense.createdByUserId, userId)
      )
    );
  return row?.count ?? 0;
}
