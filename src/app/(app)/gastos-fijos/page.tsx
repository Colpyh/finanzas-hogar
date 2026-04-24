import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getActiveFixedExpenses, getAllFixedPaymentsForPeriod } from "@/gastos-fijos/queries";
import { getHouseholdMembers } from "@/household/queries";
import { FixedExpenseList } from "@/gastos-fijos/components/fixed-expense-list";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam } from "@/shared/lib/db/helpers";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Gastos Fijos" };

type Props = {
  searchParams: Promise<{ month?: string }>;
};

type EnrichedExpense = {
  id: string;
  description: string;
  amount: string;
  recurrenceDay: number | null;
  isActive: boolean | null;
  isShared: boolean;
  responsibleName?: string | null;
  isPaidThisMonth: boolean;
  isSettled: boolean;
  currentUserStatus: "none" | "reserved" | "paid";
  confirmedCount: number;
  paidByName?: string | null;
  myShareAmount?: string;
};

const MOCK_EXPENSES: EnrichedExpense[] = [
  { id: "1", description: "Arriendo", amount: "650000", recurrenceDay: 5, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: true, isSettled: true, currentUserStatus: "paid", confirmedCount: 1, paidByName: null },
  { id: "2", description: "Internet + TV", amount: "25990", recurrenceDay: 10, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: false, isSettled: false, currentUserStatus: "reserved", confirmedCount: 1, paidByName: null },
  { id: "3", description: "Gastos comunes", amount: "85000", recurrenceDay: 15, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: false, isSettled: false, currentUserStatus: "none", confirmedCount: 0, paidByName: null },
  { id: "4", description: "Seguro auto", amount: "48000", recurrenceDay: 20, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: false, isSettled: false, currentUserStatus: "none", confirmedCount: 0, paidByName: null },
];

export default async function GastosFijosPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = parseMonthParam(params.month);

  let expenses: EnrichedExpense[] = MOCK_EXPENSES;
  let memberCount = 1;
  let hasPendingBalances = false;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const [dbExpenses, members, allPayments] = await Promise.all([
        getActiveFixedExpenses(household.id),
        getHouseholdMembers(household.id),
        getAllFixedPaymentsForPeriod(household.id, month),
      ]);
      memberCount = members.length || 1;
      const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? ""]));

      const paymentsByExpense = new Map<string, typeof allPayments[number]["payment"][]>();
      for (const { payment } of allPayments) {
        const list = paymentsByExpense.get(payment.expenseId) ?? [];
        list.push(payment);
        paymentsByExpense.set(payment.expenseId, list);
      }

      expenses = dbExpenses.map((e) => {
        const payments = paymentsByExpense.get(e.id) ?? [];
        const isShared = e.isShared ?? false;
        // Solo cuentan como "pagado completo" los que tienen status='paid'
        const paidPayments = payments.filter((p) => p.status === "paid");
        const paidCount = paidPayments.length;
        const confirmedCount = paidCount;
        // isPaidThisMonth = al menos uno pagó (el gasto está cubierto ante quien cobra)
        const isPaidThisMonth = paidCount >= 1;
        // isSettled = todos los miembros registraron su parte (deuda interna saldada)
        const isSettled = paidCount >= memberCount;
        const myPayment = payments.find((p) => p.paidBy === user.id);
        const currentUserStatus = myPayment
          ? (myPayment.status as "reserved" | "paid")
          : "none";
        const otherPaidPayment = isShared
          ? paidPayments.find((p) => p.paidBy !== user.id)
          : null;
        const paidByName = otherPaidPayment
          ? (memberMap.get(otherPaidPayment.paidBy) ?? null)
          : null;
        const totalAmount = parseFloat(e.amount ?? "0");
        const myShareAmount = isShared && memberCount > 1
          ? (totalAmount / memberCount).toFixed(2)
          : (e.amount ?? "0");
        return {
          id: e.id,
          description: e.description,
          amount: e.amount ?? "0",
          recurrenceDay: e.recurrenceDay,
          isActive: e.isActive,
          isShared,
          responsibleName: e.responsibleId ? (memberMap.get(e.responsibleId) ?? null) : null,
          isPaidThisMonth,
          isSettled,
          currentUserStatus,
          confirmedCount,
          paidByName,
          myShareAmount,
        };
      });

      hasPendingBalances = expenses.some(
        (e) => e.isShared && e.isPaidThisMonth && !e.isSettled
      );
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Gastos Fijos</h1>
        <div className="flex items-center gap-2">
          <MonthSelector month={month} />
          <Link href="/gastos-fijos/nuevo" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Plus size={15} />
            Nuevo
          </Link>
        </div>
      </div>
      {hasPendingBalances && (
        <Link
          href={`/balances?month=${month}`}
          className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700 hover:bg-amber-500/15 transition-colors"
        >
          <Scale size={16} className="shrink-0" />
          <span className="flex-1 font-medium">Hay deudas pendientes este mes</span>
          <span className="text-xs text-amber-600">Ver balances →</span>
        </Link>
      )}
      <FixedExpenseList expenses={expenses} memberCount={memberCount} />
    </div>
  );
}
