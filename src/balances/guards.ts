import { getHouseholdMembers } from "@/household/queries";
import { getPendingBalances } from "./queries";

/**
 * Devuelve un mensaje de error si el gasto tiene deuda sin saldar entre
 * miembros (algún mes con pago parcial), o null si es seguro borrarlo.
 *
 * El balance (getPendingBalances) solo considera gastos con deletedAt null:
 * soft-borrar un gasto compartido con meses sin saldar haría desaparecer
 * esa deuda en silencio — misma clase de bug que el guard de removeMember.
 */
export async function pendingDebtGuard(
  householdId: string,
  currentUserId: string,
  expenseId: string,
  action: string = "eliminarlo"
): Promise<string | null> {
  const members = await getHouseholdMembers(householdId);
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? "Usuario"]));
  const balances = await getPendingBalances(householdId, members.length, memberMap, currentUserId);
  const hasDebt = balances.some((b) => b.items.some((i) => i.expenseId === expenseId));
  return hasDebt
    ? `Este gasto tiene deudas sin saldar entre miembros. Salda el balance antes de ${action}.`
    : null;
}

export type PendingDebtSummary = { totalAmount: number; debtorNames: string[] };

/**
 * Igual que pendingDebtGuard pero devuelve el detalle (monto + a quién se le
 * debe) en vez de un mensaje fijo, para que el caller pueda mostrar una
 * confirmación explícita ("¿desmarcar igual?") en vez de bloquear directo.
 */
export async function getPendingDebtSummary(
  householdId: string,
  currentUserId: string,
  expenseId: string
): Promise<PendingDebtSummary | null> {
  const members = await getHouseholdMembers(householdId);
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? "Usuario"]));
  const balances = await getPendingBalances(householdId, members.length, memberMap, currentUserId);

  let totalAmount = 0;
  const debtorNames = new Set<string>();
  for (const b of balances) {
    for (const item of b.items) {
      if (item.expenseId !== expenseId) continue;
      totalAmount += item.shareAmount;
      debtorNames.add(b.memberName);
    }
  }
  return totalAmount > 0 ? { totalAmount, debtorNames: Array.from(debtorNames) } : null;
}
