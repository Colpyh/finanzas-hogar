/** Reparto por partes iguales entre los miembros del hogar. */
export function splitShare(amount: number, memberCount: number): number {
  return amount / memberCount;
}

/**
 * Igual que splitShare, pero formateado como string de 2 decimales para
 * persistir en una columna numeric (amount ya puede venir como string desde
 * Zod/DB o como number desde un cálculo intermedio).
 */
export function splitShareForDb(
  amount: string | number | null | undefined,
  memberCount: number
): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? "0");
  return splitShare(n, memberCount).toFixed(2);
}
