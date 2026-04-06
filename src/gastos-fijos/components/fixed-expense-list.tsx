import { FixedExpenseCard } from "./fixed-expense-card";

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
      <div className="text-center py-12 text-muted-foreground">
        <p>No tenés gastos fijos registrados.</p>
        <p className="text-sm mt-1">Agregá uno con el botón de arriba.</p>
      </div>
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
