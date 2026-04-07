import { isNull } from "drizzle-orm";
import type { Column } from "drizzle-orm";

/**
 * Returns a Drizzle condition for filtering soft-deleted rows.
 * Usage: .where(withNotDeleted(table.deletedAt))
 */
export function withNotDeleted(deletedAtColumn: Column) {
  return isNull(deletedAtColumn);
}

/**
 * Returns the first day of the current UTC month as a 'YYYY-MM-01' string.
 * Used as period_month for fixed_expense_payment records.
 */
export function currentPeriodMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Returns { limit, offset } for SQL pagination.
 * page is 1-indexed.
 */
export function paginationHelper(
  page: number,
  pageSize: number
): { limit: number; offset: number } {
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}
