"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { settleAllWithMember, type SettleAllItem } from "@/balances/actions";
import { toast } from "sonner";

type Props = {
  memberName: string;
  items: SettleAllItem[];
};

/**
 * Salda de una vez todos los movimientos pendientes con una contraparte
 * (card de neto por miembro en Balances). Al confirmar oculta el botón —
 * el server component re-renderiza sin la card apenas el neto llega a 0.
 */
export function SettleAllButton({ memberName, items }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      const result = await settleAllWithMember(items);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done || items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1.5 disabled:opacity-60"
      >
        {pending ? "Saldando…" : "Saldar todo"}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Saldar cuenta completa?"
        description={`Se registrarán como saldados los ${items.length} movimiento${items.length === 1 ? "" : "s"} pendientes con ${memberName}.`}
        confirmText="Sí, saldar todo"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
