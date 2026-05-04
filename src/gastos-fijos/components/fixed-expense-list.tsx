import { FixedExpenseCard } from "./fixed-expense-card";
import { EmptyState } from "@/shared/components/empty-state";

type EnrichedExpense = {
  id: string;
  description: string;
  amount: string;
  type?: string;
  recurrenceDay: number | null;
  isActive: boolean | null;
  categoryName?: string;
  isShared: boolean;
  responsibleName?: string | null;
  isPaidThisMonth: boolean;
  isSettled: boolean;
  currentUserStatus: "none" | "reserved" | "paid";
  confirmedCount: number;
  paidByName?: string | null;
  myShareAmount?: string;
};

type Props = {
  expenses: EnrichedExpense[];
  memberCount: number;
  periodMonth: string;
};

export function FixedExpenseList({ expenses, memberCount, periodMonth }: Props) {
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
          isSettled={exp.isSettled}
          currentUserStatus={exp.currentUserStatus}
          paidByName={exp.paidByName}
          myShareAmount={exp.myShareAmount}
          periodMonth={periodMonth}
        />
      ))}
    </div>
  );
}
