import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";

/**
 * Cuotas COMPARTIDAS: installmentsPaid no se guarda ni se incrementa — se
 * deriva contando cuántos periodMonth distintos tienen fila `paid` de TODOS
 * los miembros del hogar. Así, deshacer un pago (DELETE en
 * fixed_expense_payment) se refleja solo, sin dejar un contador
 * desincronizado — el bug de la versión anterior (columna incrementada a
 * mano, sin camino de vuelta).
 *
 * Devuelve expenseId -> cuotas pagadas, solo para gastos type=installment
 * isShared=true del hogar. Las NO compartidas siguen usando
 * expense.installmentsPaid (ahí no hay "deshacer" que las desincronice).
 */
export async function getSharedInstallmentsPaidCounts(
  householdId: string,
  memberCount: number
): Promise<Map<string, number>> {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "expenses"), hhTag(householdId, "payments"))

  const rows = await db
    .select({
      expenseId: fixedExpensePayment.expenseId,
      periodMonth: fixedExpensePayment.periodMonth,
      payers: sql<number>`count(*)::int`,
    })
    .from(fixedExpensePayment)
    .innerJoin(expense, eq(fixedExpensePayment.expenseId, expense.id))
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.type, "installment"),
        eq(expense.isShared, true),
        eq(fixedExpensePayment.status, "paid")
      )
    )
    .groupBy(fixedExpensePayment.expenseId, fixedExpensePayment.periodMonth);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.payers >= memberCount) {
      counts.set(row.expenseId, (counts.get(row.expenseId) ?? 0) + 1);
    }
  }
  return counts;
}

/** installmentsPaid efectivo de una fila: derivado si es compartida, columna si no. */
export function effectiveInstallmentsPaid(
  row: { id: string; isShared?: boolean | null; installmentsPaid: number | null },
  sharedCounts: Map<string, number>
): number {
  return row.isShared ? (sharedCounts.get(row.id) ?? 0) : (row.installmentsPaid ?? 0);
}
