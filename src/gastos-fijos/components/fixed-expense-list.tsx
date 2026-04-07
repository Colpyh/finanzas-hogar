import { FixedExpenseCard } from "./fixed-expense-card";
import { EmptyState } from "@/shared/components/empty-state";

type Payment = { expenseId: string };

type Expense = {
  id: string;
  description: string;
  amount: string;
  recurrenceDay: number | null;
  isActive: boolean | null;
};

type Props = {
  expenses: Expense[];
  paymentsThisMonth: Payment[];
};

export function FixedExpenseList({ expenses, paymentsThisMonth }: Props) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        message="No tenés gastos fijos registrados."
        description="Agregá uno con el botón de arriba."
      />
    );
  }

  const paidIds = new Set(paymentsThisMonth.map((p) => p.expenseId));

  return (
    <div className="space-y-3">
      {expenses.map((exp) => (
        <FixedExpenseCard
          key={exp.id}
          expense={exp}
          isPaidThisMonth={paidIds.has(exp.id)}
        />
      ))}
    </div>
  );
}
