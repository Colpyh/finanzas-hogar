"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { settleBalanceItem } from "@/balances/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { toast } from "sonner";

type Props = {
  expenseId: string;
  description: string;
  shareAmount: number;
  periodMonth: string;
  /** Miembro cuya parte se salda (el deudor de este ítem). */
  debtorId: string;
  /** Nombre del deudor, para el mensaje cuando soy el acreedor. */
  debtorName: string;
  iAmCreditor: boolean;
};

export function SettleButton({ expenseId, description, shareAmount, periodMonth, debtorId, debtorName, iAmCreditor }: Props) {
  const [open, setOpen] = useState(false);
  // Optimista: el ítem se marca "Saldado" al confirmar, sin esperar el
  // roundtrip; si la action falla, vuelve al botón con un toast.
  const [settled, setSettled] = useState(false);
  const [, startTransition] = useTransition();

  function handleConfirm() {
    setOpen(false);
    setSettled(true);
    startTransition(async () => {
      const result = await settleBalanceItem(expenseId, periodMonth, debtorId);
      if (result?.error) {
        setSettled(false);
        toast.error(result.error);
      }
    });
  }

  if (settled) {
    return (
      <span className="text-xs font-medium text-muted-foreground shrink-0">✓ Saldado</span>
    );
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
        onOpenChange={setOpen}
        title="¿Saldar este gasto?"
        description={
          iAmCreditor
            ? `Registrarás el pago de ${debtorName} por "${description}" (${formatCurrency(shareAmount)}). Esto saldará su parte.`
            : `Registrarás tu pago de "${description}" (${formatCurrency(shareAmount)}). Esto cerrará tu deuda de este ítem.`
        }
        confirmText="Sí, saldar"
        loading={false}
        onConfirm={handleConfirm}
      />
    </>
  );
}
