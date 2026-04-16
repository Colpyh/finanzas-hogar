"use client";

import { useTransition } from "react";
import { deleteIncome } from "@/ingresos/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { useState } from "react";
import { Trash2, Wallet, TrendingUp, RefreshCw } from "lucide-react";

type IncomeRow = {
  id: string;
  type: string;
  description: string;
  amount: string | number;
};

type Props = {
  rows: IncomeRow[];
};

function IncomeItem({ row }: { row: IncomeRow }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteIncome(row.id);
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 py-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
          {row.type === "salary" ? (
            <Wallet size={16} className="text-emerald-500" />
          ) : (
            <TrendingUp size={16} className="text-emerald-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{row.description}</p>
            {row.type === "salary" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                <RefreshCw size={9} />
                Mensual
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {row.type === "salary" ? "Sueldo" : "Ingreso puntual"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(Number(row.amount))}
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar ingreso"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar ingreso?"
        description={
          row.type === "salary"
            ? `Se eliminará el sueldo "${row.description}" (${formatCurrency(Number(row.amount))}). Dejará de aparecer en todos los meses hasta que ingreses uno nuevo.`
            : `Se eliminará "${row.description}" (${formatCurrency(Number(row.amount))}) del mes.`
        }
        confirmText="Eliminar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function IncomeList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No hay ingresos registrados para este mes.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <IncomeItem key={row.id} row={row} />
      ))}
    </div>
  );
}
