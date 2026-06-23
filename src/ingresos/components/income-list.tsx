"use client";

import { useTransition } from "react";
import { deleteIncome } from "@/ingresos/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { useState } from "react";
import { Trash2 } from "lucide-react";

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
      <div className="flex items-center gap-3 px-4 py-[13px] border-b border-border last:border-b-0">
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[17px] flex-shrink-0"
          style={{ background: "rgba(34,197,94,0.13)" }}
        >
          {row.type === "salary" ? "💰" : "💸"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-foreground truncate">{row.description}</p>
          <p className="text-[11.5px] text-muted-foreground mt-[1px]">
            {row.type === "salary" ? "Salario mensual" : "Ingreso puntual"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[14px] font-extrabold num" style={{ color: "#16a34a" }}>
            +{formatCurrency(Number(row.amount))}
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar ingreso"
          >
            <Trash2 size={13} />
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
    <div
      className="bg-card border border-border rounded-[18px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {rows.map((row) => (
        <IncomeItem key={row.id} row={row} />
      ))}
    </div>
  );
}
