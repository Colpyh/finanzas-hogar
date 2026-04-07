/**
 * Formats a Date or YYYY-MM-DD string in es-AR locale.
 */
export function formatDate(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value + "T00:00:00") : value;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

type Props = {
  value: Date | string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
};

export function DateDisplay({ value, options, className }: Props) {
  return <span className={className}>{formatDate(value, options)}</span>;
}
