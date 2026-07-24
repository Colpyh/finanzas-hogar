/**
 * Formatea un monto en pesos chilenos (CLP).
 * Sin decimales — el peso chileno no usa centavos.
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
