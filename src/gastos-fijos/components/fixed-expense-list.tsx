import { FixedExpenseCard } from "./fixed-expense-card";
import { EmptyState } from "@/shared/components/empty-state";
import { formatCurrency } from "@/shared/components/currency-display";

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

function SectionLabel({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <div className="flex items-center justify-between px-0.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.6px]">
        {label} · {count}
      </span>
      {total > 0 && (
        <span className="text-[11px] font-medium text-muted-foreground num">
          {formatCurrency(total)}
        </span>
      )}
    </div>
  );
}

function GroupCard({ expenses, periodMonth }: { expenses: EnrichedExpense[]; periodMonth: string }) {
  return (
    <div className="bg-card border border-border rounded-[14px] overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
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

export function FixedExpenseList({ expenses, memberCount: _memberCount, periodMonth }: Props) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        message="No tienes gastos fijos registrados."
        description="Agrega uno con el botón de arriba."
      />
    );
  }

  const paid = expenses.filter(
    (e) => e.isSettled || (!e.isShared && e.isPaidThisMonth)
  );
  const pending = expenses.filter(
    (e) => !(e.isSettled || (!e.isShared && e.isPaidThisMonth))
  );

  const sumGroup = (group: EnrichedExpense[]) =>
    group.reduce((acc, e) => acc + (e.type === "variable" ? 0 : parseFloat(e.amount)), 0);

  return (
    <div className="space-y-3">
      {paid.length > 0 && (
        <>
          <SectionLabel label="Pagados" count={paid.length} total={sumGroup(paid)} />
          <GroupCard expenses={paid} periodMonth={periodMonth} />
        </>
      )}
      {pending.length > 0 && (
        <>
          <SectionLabel label="Pendientes" count={pending.length} total={sumGroup(pending)} />
          <GroupCard expenses={pending} periodMonth={periodMonth} />
        </>
      )}
    </div>
  );
}
