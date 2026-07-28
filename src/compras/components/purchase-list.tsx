"use client";

import { PurchaseCard } from "./purchase-card";
import { InstallmentCard } from "./installment-card";
import { EmptyState } from "@/shared/components/empty-state";

type Expense = {
  id: string;
  type: string;
  description: string;
  amount: string | null;
  expenseDate: string | null;
  installmentAmount: string | null;
  installmentsPaid: number | null;
  installmentsTotal: number | null;
  categoryId?: string | null;
  categoryName?: string;
  responsibleId?: string | null;
  responsibleName?: string | null;
  cardId?: string | null;
  cardKind?: string | null;
  cardName?: string | null;
  cardColor?: string | null;
  cardLastFour?: string | null;
  paidAt?: string | null;
  isShared?: boolean;
  currentUserStatus?: "none" | "reserved" | "paid";
  isPaidThisMonth?: boolean;
  isSettled?: boolean;
  paidByName?: string | null;
  myShareAmount?: string;
};

type Props = { expenses: Expense[]; tab: "compras" | "cuotas"; month: string };

export function PurchaseList({ expenses, tab, month }: Props) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        message={tab === "cuotas" ? "No hay cuotas activas." : "No hay compras registradas."}
        description="Usá el botón + para agregar una."
      />
    );
  }

  if (tab === "cuotas") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        {expenses.map((exp) => (
          <InstallmentCard key={exp.id} expense={exp} month={month} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {expenses.map((exp) => (
        <PurchaseCard
          key={exp.id}
          expense={{ ...exp, amount: exp.amount ?? "0" }}
        />
      ))}
    </div>
  );
}
