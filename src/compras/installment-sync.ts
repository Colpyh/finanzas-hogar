import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Cierra el mes de una cuota COMPARTIDA: cuando todos los miembros registraron
 * su parte del período (paidCount >= memberCount), incrementa installmentsPaid.
 *
 * Sin esto las cuotas compartidas nunca completaban (markAsMonthlyPayer y
 * registerInstallmentShare no tocan el contador por diseño) y seguían sumando
 * al total del dashboard indefinidamente, años después de terminadas.
 *
 * Llamar SOLO después de un insert de pago exitoso: la unique constraint
 * uq_expense_period_user garantiza un insert por miembro+mes, así que el
 * incremento ocurre exactamente una vez por mes completado. El incremento es
 * atómico en SQL y está acotado por installmentsTotal.
 */
export async function syncSharedInstallmentCounter(
  expenseId: string,
  householdId: string,
  periodMonth: string,
  memberCount: number
): Promise<void> {
  const [exp] = await db
    .select({ type: expense.type })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, householdId)))
    .limit(1);
  if (exp?.type !== "installment") return;

  const paidRows = await db
    .select({ id: fixedExpensePayment.id })
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.periodMonth, periodMonth),
        eq(fixedExpensePayment.status, "paid")
      )
    );
  if (paidRows.length < memberCount) return;

  await db
    .update(expense)
    .set({ installmentsPaid: sql`coalesce(${expense.installmentsPaid}, 0) + 1` })
    .where(
      and(
        eq(expense.id, expenseId),
        eq(expense.householdId, householdId),
        sql`coalesce(${expense.installmentsPaid}, 0) < coalesce(${expense.installmentsTotal}, 0)`
      )
    );
}
