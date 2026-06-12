/**
 * Pure functions for month navigation and formatting.
 * All operate on 'YYYY-MM' strings.
 */

export function getPrevMonth(month: string): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(year, m - 2, 1); // month is 0-indexed, go back 1
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getNextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(year, m, 1); // month is 0-indexed, go forward 1
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString("es-419", { month: "long", year: "numeric" });
}

/** Converts 'YYYY-MM' → 'YYYY-MM-01' for DB date comparisons */
export function monthToDate(month: string): string {
  return `${month}-01`;
}

/** Returns current month as 'YYYY-MM' */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Returns calendar months elapsed from startMonth to targetMonth.
 * Accepts 'YYYY-MM' or 'YYYY-MM-DD'. Result is 0 when same month, negative if target is before start. */
export function elapsedMonths(startMonth: string, targetMonth: string): number {
  const sy = parseInt(startMonth.slice(0, 4));
  const sm = parseInt(startMonth.slice(5, 7));
  const ty = parseInt(targetMonth.slice(0, 4));
  const tm = parseInt(targetMonth.slice(5, 7));
  return (ty - sy) * 12 + (tm - sm);
}
