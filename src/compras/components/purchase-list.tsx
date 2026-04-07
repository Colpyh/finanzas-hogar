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
  categoryName?: string;
};

type Props = { expenses: Expense[] };

export function PurchaseList({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        message="No hay compras registradas."
        description="Usá el botón + para agregar una."
      />
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((exp) =>
        exp.type === "installment" ? (
          <InstallmentCard
            key={exp.id}
            expense={{ ...exp, installmentAmount: exp.installmentAmount }}
          />
        ) : (
          <PurchaseCard
            key={exp.id}
            expense={{ ...exp, amount: exp.amount ?? "0" }}
          />
        )
      )}
    </div>
  );
}
