import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getActiveFixedExpenses, getPaymentForCurrentMonth } from "@/gastos-fijos/queries";
import { FixedExpenseList } from "@/gastos-fijos/components/fixed-expense-list";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Gastos Fijos" };

type ExpenseRow = {
  id: string;
  description: string;
  amount: string;
  recurrenceDay: number | null;
  isActive: boolean | null;
};

const MOCK_EXPENSES: ExpenseRow[] = [
  { id: "1", description: "Arriendo", amount: "650000", recurrenceDay: 5, isActive: true },
  { id: "2", description: "Internet + TV", amount: "25990", recurrenceDay: 10, isActive: true },
  { id: "3", description: "Gastos comunes", amount: "85000", recurrenceDay: 15, isActive: true },
  { id: "4", description: "Seguro auto", amount: "48000", recurrenceDay: 20, isActive: true },
];
const MOCK_PAYMENTS = [{ expenseId: "1" }, { expenseId: "2" }];

export default async function GastosFijosPage() {
  let expenses: ExpenseRow[] = MOCK_EXPENSES;
  let paymentsThisMonth: { expenseId: string }[] = MOCK_PAYMENTS;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const dbExpenses = await getActiveFixedExpenses(household.id);
      const dbPayments = await Promise.all(
        dbExpenses.map((exp) => getPaymentForCurrentMonth(exp.id))
      );
      expenses = dbExpenses.map((e) => ({ ...e, amount: e.amount ?? "0" }));
      paymentsThisMonth = dbPayments
        .filter(Boolean)
        .map((p) => ({ expenseId: p!.expenseId }));
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Gastos Fijos</h1>
        <Link href="/gastos-fijos/nuevo" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus size={15} />
          Nuevo
        </Link>
      </div>
      <FixedExpenseList expenses={expenses} paymentsThisMonth={paymentsThisMonth} />
    </div>
  );
}
