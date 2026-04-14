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

type Props = {
  expense: {
    id: string;
    description: string;
    installmentsPaid: number;
    installmentsTotal: number;
  };
};

export function EditInstallmentDialog({ expense }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(expense.description);
  const [installmentsPaid, setInstallmentsPaid] = useState(expense.installmentsPaid);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpen(value: boolean) {
    if (value) {
      setDescription(expense.description);
      setInstallmentsPaid(expense.installmentsPaid);
      setError(null);
    }
    setOpen(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateInstallment(expense.id, {
        description,
        installmentsPaid,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
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
            <input
              type="number"
              min={0}
              max={expense.installmentsTotal}
              value={installmentsPaid}
              onChange={(e) => setInstallmentsPaid(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
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
    </Dialog>
  );
}
