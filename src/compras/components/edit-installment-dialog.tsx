"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateInstallment } from "@/compras/actions";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  expense: {
    id: string;
    description: string;
    installmentsPaid: number;
    installmentsTotal: number;
    isShared?: boolean;
  };
};

export function EditInstallmentDialog({ expense }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(expense.description);
  const [installmentsPaid, setInstallmentsPaid] = useState(expense.installmentsPaid);
  const [isShared, setIsShared] = useState(expense.isShared ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDebt, setPendingDebt] = useState<{ totalAmount: number; debtorNames: string[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const [forcing, startForceTransition] = useTransition();

  function handleOpen(value: boolean) {
    if (value) {
      setDescription(expense.description);
      setInstallmentsPaid(expense.installmentsPaid);
      setIsShared(expense.isShared ?? false);
      setError(null);
      setPendingDebt(null);
    }
    setOpen(value);
  }

  function save(force: boolean) {
    setError(null);
    const run = force ? startForceTransition : startTransition;
    run(async () => {
      const result = await updateInstallment(
        expense.id,
        {
          description,
          // Compartidas: installmentsPaid se deriva de los pagos reales, no se
          // edita a mano (ver shared/lib/db/installments.ts).
          ...(isShared ? {} : { installmentsPaid }),
          isShared,
        },
        force ? { force: true } : undefined
      );
      if (result?.pendingDebt) {
        setPendingDebt(result.pendingDebt);
        return;
      }
      if (result?.error) {
        setError(result.error);
      } else {
        setPendingDebt(null);
        setOpen(false);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        title="Editar"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil size={14} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cuota</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Cuotas pagadas
              <span className="text-muted-foreground font-normal ml-1">
                (máx. {expense.installmentsTotal})
              </span>
            </label>
            {isShared ? (
              <p className="text-sm text-muted-foreground px-3 py-2 rounded-lg border border-border bg-muted/30">
                {installmentsPaid} — se calcula solo según los pagos registrados por cada miembro
              </p>
            ) : (
              <input
                type="number"
                min={0}
                max={expense.installmentsTotal}
                value={installmentsPaid}
                onChange={(e) => setInstallmentsPaid(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsShared((v) => !v)}
            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              isShared ? "border-primary/40 bg-primary/5" : "border-border bg-card"
            }`}
            disabled={pending}
          >
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Gasto compartido</p>
              <p className="text-xs text-muted-foreground mt-0.5">Se divide con el resto del hogar — verás la deuda en Balances</p>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isShared ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isShared ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </button>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        open={pendingDebt !== null}
        onOpenChange={(o) => !o && setPendingDebt(null)}
        title="Deuda sin saldar"
        description={
          pendingDebt
            ? `Esta cuota tiene una parte sin saldar de ${pendingDebt.debtorNames.join(", ")} (${formatCurrency(pendingDebt.totalAmount)}). Si la desmarcás como compartida, esa deuda desaparece del balance y no se puede deshacer.`
            : undefined
        }
        confirmText="Desmarcar igual"
        variant="destructive"
        loading={forcing}
        onConfirm={() => save(true)}
      />
    </Dialog>
  );
}
