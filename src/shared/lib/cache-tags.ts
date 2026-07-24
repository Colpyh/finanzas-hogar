/**
 * Tags de caché GRANULARES por dominio de datos del hogar.
 *
 * Antes: un único tag (el householdId) para TODO → cualquier mutación
 * (marcar un pago) invalidaba la caché completa del hogar y cada vuelta al
 * dashboard era 100% fría. Ahora cada query se tagea con los dominios que
 * LEE y cada action invalida solo los dominios que ESCRIBE.
 *
 * Reglas:
 * - Las queries cachadas SIEMPRE tagean también el master tag (householdId
 *   pelado): es la palanca "invalidar todo el hogar", reservada para
 *   operaciones raras (renombrar hogar, altas/bajas de miembros).
 * - Una query que LLAMA a otra función cacheada debe tagear también los
 *   dominios que esa función lee: invalidar el tag de la interna NO
 *   invalida a la externa (cachean por separado).
 */
export type CacheDomain =
  | "expenses"   // tabla expense (compras, cuotas, fijos, variables, receipts)
  | "payments"   // tabla fixed_expense_payment (pagos del período, settlements)
  | "cards"      // tabla card
  | "categories" // tabla category
  | "income"     // tabla income
  | "members"    // tabla household_member
  | "pending";   // tabla pending_expense (gastos por confirmar de email/cartola)

export function hhTag(householdId: string, domain: CacheDomain): string {
  return `${householdId}:${domain}`;
}
