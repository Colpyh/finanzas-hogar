/**
 * Formats a Date or YYYY-MM-DD string in es-419 locale.
 */
export function formatDate(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value + "T00:00:00") : value;
  return date.toLocaleDateString("es-419", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}
