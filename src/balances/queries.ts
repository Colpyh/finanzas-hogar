import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment, category } from "@/shared/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { splitShare } from "@/shared/lib/split-share";

export type BalanceItem = {
  expenseId: string;
  description: string;
  type: "fixed" | "variable" | "installment" | "one_time";
  categoryName: string;
  /** Ruta en el bucket privado `receipts` — null si no tiene boleta escaneada. */
  receiptImagePath: string | null;
  totalAmount: number;
  shareAmount: number;
  payerId: string;
  debtorId: string;
  /** Mes ('YYYY-MM-01') de esta deuda puntual — usado para saldarla. */
  periodMonth: string;
};

export type MemberBalance = {
  memberId: string;
  memberName: string;
  /** Positive = they owe you. Negative = you owe them. */
  net: number;
  items: BalanceItem[];
};

/**
 * Returns the ACCUMULATED pending balances for a household across ALL months.
 *
 * A debt exists, per shared expense and per month, when one member paid that
 * month but the other(s) haven't settled their share. We sum those debts over
 * every month (not just the current one), so the balance reflects the full
 * outstanding amount the other member owes — and persists even after the card /
 * installments are fully paid, until each share is actually settled.
 *
 * Settling is still per-item (per expense+month) via `settleBalanceItem`, which
 * records the debtor's payment for that month, removing that item from the sum.
 */
/**
 * Ítems de deuda del hogar — TODO lo que no depende de quién mira
 * (montos, pagador, deudor, mes). Cacheado por hogar: era el único camino
 * sin caché del dashboard y bloqueaba el primer paint en cada request.
 * La parte por-usuario (signo del neto y agrupación) se calcula en
 * getPendingBalances sobre este resultado, después de la caché.
 */
async function getHouseholdDebtItems(
  householdId: string,
  memberCount: number,
  memberIds: string[]
): Promise<BalanceItem[]> {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "expenses"), hhTag(householdId, "payments"), hhTag(householdId, "categories"))
  const expenses = await db
    .select({
      id: expense.id,
      type: expense.type,
      description: expense.description,
      amount: expense.amount,
      installmentAmount: expense.installmentAmount,
      categoryId: expense.categoryId,
      receiptImagePath: expense.receiptImagePath,
    })
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.isShared, true),
        eq(expense.isPrivate, false),
        isNull(expense.deletedAt)
      )
    );

  if (expenses.length === 0) return [];

  // Incluye las categorías globales (household_id null) además de las
  // propias del hogar — omitirlas deja "Sin categoría" en cualquier gasto
  // categorizado con una default (mismo bug que tuvo resumen/queries.ts).
  const categories = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(or(isNull(category.householdId), eq(category.householdId, householdId)));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // All payments for shared expenses, across every month (no period filter).
  // isPrivate=false: un gasto compartido+privado (estado contradictorio; el
  // form y el schema lo impiden en creación) nunca debe generar ni exponer
  // deuda entre miembros — categórico, no depende de quién mira (este
  // resultado se cachea sin userId y se comparte entre ambos miembros).
  const allPayments = await db
    .select({ payment: fixedExpensePayment })
    .from(fixedExpensePayment)
    .innerJoin(expense, eq(fixedExpensePayment.expenseId, expense.id))
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.isShared, true),
        eq(expense.isPrivate, false),
        isNull(expense.deletedAt)
      )
    );

  // Group payments by expense, then by month.
  const byExpenseMonth = new Map<string, Map<string, typeof allPayments[number]["payment"][]>>();
  for (const row of allPayments) {
    const p = row.payment;
    let monthMap = byExpenseMonth.get(p.expenseId);
    if (!monthMap) {
      monthMap = new Map();
      byExpenseMonth.set(p.expenseId, monthMap);
    }
    const list = monthMap.get(p.periodMonth) ?? [];
    list.push(p);
    monthMap.set(p.periodMonth, list);
  }

  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  const items: BalanceItem[] = [];

  for (const [expenseId, monthMap] of byExpenseMonth) {
    const exp = expenseById.get(expenseId);
    if (!exp) continue;

    for (const [month, payments] of monthMap) {
      const paidPayments = payments.filter((p) => p.status === "paid");
      const paidCount = paidPayments.length;

      // Debt for this month exists only when someone paid but not everyone settled.
      if (paidCount === 0 || paidCount >= memberCount) continue;

      const payer = paidPayments[0];
      if (!payer) continue;

      // Cuotas: monto mensual de la cuota. Variables: el monto real pagado ese mes. Fijos: el monto fijo.
      const totalAmount =
        exp.type === "installment"
          ? parseFloat(exp.installmentAmount ?? "0")
          : exp.type === "variable"
            ? parseFloat(payer.amount ?? "0")
            : parseFloat(exp.amount ?? "0");
      const shareAmount = splitShare(totalAmount, memberCount);

      const paidByIds = new Set(paidPayments.map((p) => p.paidBy));
      for (const memberId of memberIds) {
        if (paidByIds.has(memberId)) continue;

        items.push({
          expenseId: exp.id,
          description: exp.description,
          type: exp.type,
          categoryName: categoryMap.get(exp.categoryId) ?? "Sin categoría",
          receiptImagePath: exp.receiptImagePath ?? null,
          totalAmount,
          shareAmount,
          payerId: payer.paidBy,
          debtorId: memberId,
          periodMonth: month,
        });
      }
    }
  }

  return items;
}

export async function getPendingBalances(
  householdId: string,
  memberCount: number,
  memberMap: Map<string, string>,
  currentUserId: string
): Promise<MemberBalance[]> {
  // Ordenado para que la clave de caché sea estable entre requests.
  const memberIds = Array.from(memberMap.keys()).sort();
  const items = await getHouseholdDebtItems(householdId, memberCount, memberIds);

  const balanceMap = new Map<string, MemberBalance>();
  for (const item of items) {
    const otherMemberId = currentUserId === item.payerId ? item.debtorId : item.payerId;

    if (!balanceMap.has(otherMemberId)) {
      balanceMap.set(otherMemberId, {
        memberId: otherMemberId,
        memberName: memberMap.get(otherMemberId) ?? otherMemberId,
        net: 0,
        items: [],
      });
    }

    const balance = balanceMap.get(otherMemberId)!;
    // Positive net = other owes current user. Negative = current user owes other.
    balance.net += currentUserId === item.payerId ? item.shareAmount : -item.shareAmount;
    balance.items.push(item);
  }

  // Most recent month first within each member's items.
  for (const b of balanceMap.values()) {
    b.items.sort((a, c) => c.periodMonth.localeCompare(a.periodMonth));
  }

  return Array.from(balanceMap.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}
