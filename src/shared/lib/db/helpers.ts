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
 * True si el error es una violación de constraint UNIQUE de Postgres
 * (SQLSTATE 23505) — ej. dos inserts concurrentes para el mismo
 * expenseId+periodMonth+paidBy. Más robusto que matchear el mensaje por
 * string (frágil ante cambios de versión/locale del driver).
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

/**
 * Truncates a 'YYYY-MM-DD' date string to its first-of-month form
 * ('YYYY-MM-01'). Used to derive period_month from an expense's own date
 * (not "now") — e.g. a one-time shared purchase's initial settlement.
 */
export function monthFromDate(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

/**
 * Parses and validates a ?month= URL search param.
 * Accepts 'YYYY-MM-01' format. Falls back to currentPeriodMonth() if invalid.
 */
export function parseMonthParam(param: string | undefined): string {
  if (param && /^\d{4}-\d{2}-01$/.test(param)) return param;
  return currentPeriodMonth();
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
