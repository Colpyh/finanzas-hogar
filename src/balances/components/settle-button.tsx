"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { settleBalanceItem } from "@/balances/actions";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  expenseId: string;
  description: string;
  shareAmount: number;
  periodMonth: string;
  iAmCreditor: boolean;
};

export function SettleButton({ expenseId, description, shareAmount, periodMonth, iAmCreditor }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await settleBalanceItem(expenseId, periodMonth);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
      >
        Saldar
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}
        title="¿Saldar este gasto?"
        description={
          iAmCreditor
            ? `Registrarás el pago de la otra persona por "${description}" (${formatCurrency(shareAmount)}). Esto lo marcará como saldado en ambos lados.`
            : `Registrarás tu pago de "${description}" (${formatCurrency(shareAmount)}). Esto cerrará la deuda con el otro miembro.`
        }
        confirmText="Sí, saldar"
        loading={pending}
        onConfirm={handleConfirm}
      />

      {error && (
        <p className="text-xs text-destructive mt-1 text-right w-full">{error}</p>
      )}
    </>
  );
}
