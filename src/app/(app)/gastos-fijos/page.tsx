import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/auth/queries";
import { getActiveFixedExpenses, getAllFixedPaymentsForPeriod } from "@/gastos-fijos/queries";
import { getHouseholdMembers, getUserHousehold } from "@/household/queries";
import { FixedExpenseList } from "@/gastos-fijos/components/fixed-expense-list";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam } from "@/shared/lib/db/helpers";
import { variableMonthAmount } from "@/shared/lib/variable-expense";
import { splitShareForDb } from "@/shared/lib/split-share";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Scale } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Gastos Fijos" };

type Props = {
  searchParams: Promise<{ month?: string }>;
};

type EnrichedExpense = {
  id: string;
  description: string;
  amount: string;
  type: string;
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
  { id: "1", description: "Arriendo", amount: "650000", type: "fixed", recurrenceDay: 5, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: true, isSettled: true, currentUserStatus: "paid", confirmedCount: 1, paidByName: null },
  { id: "2", description: "Internet + TV", amount: "25990", type: "fixed", recurrenceDay: 10, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: false, isSettled: false, currentUserStatus: "reserved", confirmedCount: 1, paidByName: null },
  { id: "3", description: "Gastos comunes", amount: "85000", type: "fixed", recurrenceDay: 15, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: false, isSettled: false, currentUserStatus: "none", confirmedCount: 0, paidByName: null },
  { id: "4", description: "Seguro auto", amount: "48000", type: "fixed", recurrenceDay: 20, isActive: true, isShared: false, responsibleName: null, isPaidThisMonth: false, isSettled: false, currentUserStatus: "none", confirmedCount: 0, paidByName: null },
];

export default async function GastosFijosPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = parseMonthParam(params.month);

  let expenses: EnrichedExpense[] = MOCK_EXPENSES;
  let memberCount = 1;
  let hasPendingBalances = false;

  // Mocks solo sin sesión/hogar; un error real propaga al error boundary.
  const user = await getSessionUser();
  if (user) {
    const household = await getUserHousehold(user.id);
    if (household) {
      const [dbExpenses, members, allPayments] = await Promise.all([
        getActiveFixedExpenses(household.id, user.id),
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
        const isVariable = e.type === "variable";
        // Para variables, el monto real del mes viene de los pagos registrados este
        // mes (fixed_expense_payment.amount), no del default e.amount (suele ser 0).
        // MAX y no suma: la fila de settlement es una fracción de la misma boleta.
        const variableMonthTotal = variableMonthAmount(payments.map((p) => p.amount));
        const monthAmount = isVariable && payments.length > 0
          ? variableMonthTotal.toFixed(2)
          : (e.amount ?? "0");
        const totalAmount = parseFloat(monthAmount);
        let myShareAmount: string;
        if (isVariable && currentUserStatus === "none" && !isPaidThisMonth) {
          myShareAmount = "0";
        } else if (isShared && memberCount > 1) {
          myShareAmount = splitShareForDb(totalAmount, memberCount);
        } else {
          myShareAmount = monthAmount;
        }
        return {
          id: e.id,
          description: e.description,
          amount: monthAmount,
          type: e.type,
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
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ letterSpacing: "-0.3px" }}>Gastos Fijos</h1>
        <div className="flex items-center gap-2">
          <MonthSelector month={month} />
          <Link
            href="/gastos-fijos/nuevo"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5 border-0 text-white")}
            style={{ background: "linear-gradient(135deg,#8b46f0,#6d28d9)" }}
          >
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
      <FixedExpenseList expenses={expenses} memberCount={memberCount} periodMonth={month} />
    </div>
  );
}
