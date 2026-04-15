import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getActiveFixedExpenses, getPaymentsForCurrentMonth } from "@/gastos-fijos/queries";
import { getHouseholdMembers } from "@/household/queries";
import { FixedExpenseList } from "@/gastos-fijos/components/fixed-expense-list";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Gastos Fijos" };

type EnrichedExpense = {
  id: string;
  description: string;
  amount: string;
  recurrenceDay: number | null;
  isActive: boolean | null;
  isShared: boolean;
  isPaidThisMonth: boolean;
  currentUserConfirmed: boolean;
  confirmedCount: number;
};

const MOCK_EXPENSES: EnrichedExpense[] = [
  { id: "1", description: "Arriendo", amount: "650000", recurrenceDay: 5, isActive: true, isShared: false, isPaidThisMonth: true, currentUserConfirmed: true, confirmedCount: 1 },
  { id: "2", description: "Internet + TV", amount: "25990", recurrenceDay: 10, isActive: true, isShared: false, isPaidThisMonth: true, currentUserConfirmed: true, confirmedCount: 1 },
  { id: "3", description: "Gastos comunes", amount: "85000", recurrenceDay: 15, isActive: true, isShared: false, isPaidThisMonth: false, currentUserConfirmed: false, confirmedCount: 0 },
  { id: "4", description: "Seguro auto", amount: "48000", recurrenceDay: 20, isActive: true, isShared: false, isPaidThisMonth: false, currentUserConfirmed: false, confirmedCount: 0 },
];

export default async function GastosFijosPage() {
  let expenses: EnrichedExpense[] = MOCK_EXPENSES;
  let memberCount = 1;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const [dbExpenses, members] = await Promise.all([
        getActiveFixedExpenses(household.id),
        getHouseholdMembers(household.id),
      ]);
      memberCount = members.length || 1;

      const paymentsPerExpense = await Promise.all(
        dbExpenses.map((exp) => getPaymentsForCurrentMonth(exp.id))
      );

      expenses = dbExpenses.map((e, i) => {
        const payments = paymentsPerExpense[i] ?? [];
        const isShared = e.isShared ?? false;
        const confirmedCount = payments.length;
        const isPaidThisMonth = isShared
          ? confirmedCount >= memberCount
          : confirmedCount >= 1;
        const currentUserConfirmed = payments.some((p) => p.paidBy === user.id);
        return {
          id: e.id,
          description: e.description,
          amount: e.amount ?? "0",
          recurrenceDay: e.recurrenceDay,
          isActive: e.isActive,
          isShared,
          isPaidThisMonth,
          currentUserConfirmed,
          confirmedCount,
        };
      });
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Gastos Fijos</h1>
        <Link href="/gastos-fijos/nuevo" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus size={15} />
          Nuevo
        </Link>
      </div>
      <FixedExpenseList expenses={expenses} memberCount={memberCount} />
    </div>
  );
}
