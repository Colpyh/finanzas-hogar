"use client";

import { motion } from "motion/react";
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
  responsibleName?: string | null;
  cardName?: string | null;
  cardColor?: string | null;
  cardLastFour?: string | null;
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
      {expenses.map((exp, i) => (
        <motion.div
          key={exp.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
        >
          {exp.type === "installment" ? (
            <InstallmentCard expense={exp} />
          ) : (
            <PurchaseCard expense={{ ...exp, amount: exp.amount ?? "0" }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
