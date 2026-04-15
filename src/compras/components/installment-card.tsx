"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { markInstallmentPaid } from "@/compras/actions";
import { canMarkInstallmentPaid } from "@/compras/installment-utils";
import { formatCurrency } from "@/shared/components/currency-display";
import { EditInstallmentDialog } from "./edit-installment-dialog";
import Link from "next/link";

type Props = {
  expense: {
    id: string;
    description: string;
    installmentAmount: string | null;
    installmentsPaid: number | null;
    installmentsTotal: number | null;
    categoryName?: string;
    responsibleName?: string | null;
  };
};

export function InstallmentCard({ expense }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const paid = expense.installmentsPaid ?? 0;
  const total = expense.installmentsTotal ?? 0;
  const canPay = canMarkInstallmentPaid(paid, total);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;

  async function handlePay() {
    setLoading(true);
    setError(null);
    const result = await markInstallmentPaid(expense.id);
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  return (
    <div className="bg-card border border-border shadow-sm rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/gastos/${expense.id}`} className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{expense.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {expense.categoryName && (
              <span className="text-xs text-muted-foreground">{expense.categoryName}</span>
            )}
            {expense.responsibleName && (
              <>
                {expense.categoryName && <span className="text-xs text-muted-foreground/50">·</span>}
                <span className="text-xs font-medium text-primary/80">Paga: {expense.responsibleName}</span>
              </>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {paid}/{total} cuotas
          </span>
          <EditInstallmentDialog
            expense={{
              id: expense.id,
              description: expense.description,
              installmentsPaid: paid,
              installmentsTotal: total,
            }}
          />
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">
          {progress}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        {expense.installmentAmount && (
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(parseFloat(expense.installmentAmount))}/cuota
          </span>
        )}
        <Button
          size="sm"
          variant={canPay ? "outline" : "ghost"}
          disabled={!canPay || loading}
          onClick={handlePay}
          className={canPay ? "" : "text-muted-foreground ml-auto"}
        >
          {canPay ? "Marcar cuota pagada" : "Completado"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
