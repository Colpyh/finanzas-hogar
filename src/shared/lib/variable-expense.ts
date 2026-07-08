/**
 * Monto real del mes de un gasto variable a partir de los montos de sus pagos.
 *
 * El pago del titular registra la boleta completa; las filas de settlement
 * (la parte del deudor al saldar el balance) son fracciones de esa misma
 * boleta. SUMARLAS infla el total (boleta × 1.5 con 2 miembros), por eso el
 * monto del mes es el MÁXIMO de los pagos, no la suma.
 */
export function variableMonthAmount(
  paidAmounts: Array<string | number | null | undefined>
): number {
  return paidAmounts.reduce<number>((max, a) => Math.max(max, Number(a ?? 0)), 0);
}
