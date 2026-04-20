import { FixedExpenseCard } from "./fixed-expense-card";
import { EmptyState } from "@/shared/components/empty-state";

type EnrichedExpense = {
  id: string;
  description: string;
  amount: string;
  recurrenceDay: number | null;
  isActive: boolean | null;
  categoryName?: string;
  isShared: boolean;
  responsibleName?: string | null;
  isPaidThisMonth: boolean;
  currentUserStatus: "none" | "reserved" | "paid";
  confirmedCount: number;
};

type Props = {
  expenses: EnrichedExpense[];
  memberCount: number;
};

export function FixedExpenseList({ expenses, memberCount }: Props) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        message="No tienes gastos fijos registrados."
        description="Agrega uno con el botón de arriba."
      />
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((exp) => (
        <FixedExpenseCard
          key={exp.id}
          expense={exp}
          isPaidThisMonth={exp.isPaidThisMonth}
          currentUserStatus={exp.currentUserStatus}
          confirmedCount={exp.confirmedCount}
          memberCount={memberCount}
        />
      ))}
    </div>
  );
}
