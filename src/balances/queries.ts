import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export type BalanceItem = {
  expenseId: string;
  description: string;
  type: "fixed" | "installment";
  totalAmount: number;
  shareAmount: number;
  payerId: string;
  debtorId: string;
};

export type MemberBalance = {
  memberId: string;
  memberName: string;
  /** Positive = they owe you. Negative = you owe them. */
  net: number;
  items: BalanceItem[];
};

/**
 * Returns pending balances for a household in a given period.
 * A balance exists when a shared expense has one payer but not all members settled.
 */
export async function getPendingBalances(
  householdId: string,
  periodMonth: string,
  memberCount: number,
  memberMap: Map<string, string>,
  currentUserId: string
): Promise<MemberBalance[]> {
  const expenses = await db
    .select()
    .from(expense)
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.isShared, true),
        isNull(expense.deletedAt)
      )
    );

  if (expenses.length === 0) return [];

  const allPayments = await db
    .select()
    .from(fixedExpensePayment)
    .innerJoin(expense, eq(fixedExpensePayment.expenseId, expense.id))
    .where(
      and(
        eq(expense.householdId, householdId),
        eq(expense.isShared, true),
        isNull(expense.deletedAt),
        eq(fixedExpensePayment.periodMonth, periodMonth)
      )
    );

  // Group payments by expense
  const paymentsByExpense = new Map<string, typeof allPayments[number]["fixed_expense_payment"][]>();
  for (const row of allPayments) {
    const list = paymentsByExpense.get(row.fixed_expense_payment.expenseId) ?? [];
    list.push(row.fixed_expense_payment);
    paymentsByExpense.set(row.fixed_expense_payment.expenseId, list);
  }

  // Compute per-member balance
  const balanceMap = new Map<string, MemberBalance>();

  for (const exp of expenses) {
    const payments = paymentsByExpense.get(exp.id) ?? [];
    const paidPayments = payments.filter((p) => p.status === "paid");
    const paidCount = paidPayments.length;

    // Only show when exactly one person paid (debt exists)
    if (paidCount === 0 || paidCount >= memberCount) continue;

    const payer = paidPayments[0];
    if (!payer) continue;

    // Para cuotas usar el monto mensual; para variables usar el monto real pagado ese período
    const totalAmount = exp.type === "installment"
      ? parseFloat(exp.installmentAmount ?? "0")
      : exp.type === "variable"
        ? parseFloat(payer.amount ?? "0")
        : parseFloat(exp.amount ?? "0");
    const shareAmount = totalAmount / memberCount;

    // Find members who haven't paid
    const paidByIds = new Set(paidPayments.map((p) => p.paidBy));
    for (const [memberId] of memberMap) {
      if (paidByIds.has(memberId)) continue;

      // memberId owes payer.paidBy shareAmount
      const debtorId = memberId;
      const payerId = payer.paidBy;

      // Determine which "other" member to group by (from current user's perspective)
      const otherMemberId = currentUserId === payerId ? debtorId : payerId;

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
      balance.net += currentUserId === payerId ? shareAmount : -shareAmount;
      balance.items.push({
        expenseId: exp.id,
        description: exp.description,
        type: exp.type as "fixed" | "installment",
        totalAmount,
        shareAmount,
        payerId,
        debtorId,
      });
    }
  }

  return Array.from(balanceMap.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}
