import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getActiveFixedExpenses, getPaymentForCurrentMonth } from "@/gastos-fijos/queries";
import { FixedExpenseList } from "@/gastos-fijos/components/fixed-expense-list";
import { Button } from "@/components/ui/button";

export default async function GastosFijosPage() {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const expenses = await getActiveFixedExpenses(household.id);

  // Fetch payment status for each expense in parallel
  const payments = await Promise.all(
    expenses.map((exp) => getPaymentForCurrentMonth(exp.id))
  );
  const paymentsThisMonth = payments
    .filter(Boolean)
    .map((p) => ({ expenseId: p!.expenseId }));

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gastos Fijos</h1>
        <Button asChild size="sm">
          <Link href="/gastos-fijos/nuevo">+ Nuevo</Link>
        </Button>
      </div>

      <FixedExpenseList
        expenses={expenses.map((e) => ({
          ...e,
          amount: e.amount ?? "0",
        }))}
        paymentsThisMonth={paymentsThisMonth}
      />
    </div>
  );
}
