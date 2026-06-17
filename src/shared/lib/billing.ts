/**
 * Given a purchase date (YYYY-MM-DD) and a card's closing day,
 * returns the YYYY-MM of the billing period this expense belongs to.
 *
 * Purchases AFTER the closing day of their month shift to the next
 * billing period (next month). Purchases on or before the closing
 * day remain in the current month's billing period.
 *
 * Example: closingDay=25
 *   "2026-06-24" → "2026-06"  (before closing)
 *   "2026-06-25" → "2026-06"  (on closing day)
 *   "2026-06-26" → "2026-07"  (after closing → next period)
 */
export function effectiveBillingMonth(
  expenseDate: string,
  closingDay: number
): string {
  const year = parseInt(expenseDate.slice(0, 4));
  const month = parseInt(expenseDate.slice(5, 7));
  const day = parseInt(expenseDate.slice(8, 10));

  if (day > closingDay) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Returns the billing period (inclusive start and end dates as YYYY-MM-DD)
 * for expenses that are DUE in `targetMonth` for a card with `closingDay`.
 *
 * The payment due in month M covers expenses from:
 *   - Start: day (closingDay + 1) of month M-2
 *   - End:   day closingDay       of month M-1
 *
 * JS Date handles day-overflow automatically (e.g., Feb 29 in a non-leap year
 * becomes March 1), which is the correct behavior for billing periods.
 *
 * Example: targetMonth="2026-07", closingDay=25
 *   → { start: "2026-05-26", end: "2026-06-25" }
 */
export function billingPeriodForMonth(
  targetMonth: string,
  closingDay: number
): { start: string; end: string } {
  const y = parseInt(targetMonth.slice(0, 4));
  const m = parseInt(targetMonth.slice(5, 7));

  const endM = m === 1 ? 12 : m - 1;
  const endY = m === 1 ? y - 1 : y;

  const startM = endM === 1 ? 12 : endM - 1;
  const startY = endM === 1 ? endY - 1 : endY;

  const rawStart = new Date(startY, startM - 1, closingDay + 1);
  const start = `${rawStart.getFullYear()}-${String(rawStart.getMonth() + 1).padStart(2, "0")}-${String(rawStart.getDate()).padStart(2, "0")}`;

  const lastDayOfEndMonth = new Date(endY, endM, 0).getDate();
  const actualEnd = Math.min(closingDay, lastDayOfEndMonth);
  const end = `${endY}-${String(endM).padStart(2, "0")}-${String(actualEnd).padStart(2, "0")}`;

  return { start, end };
}
