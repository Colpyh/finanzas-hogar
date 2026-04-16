"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFixedExpense, deleteFixedExpense } from "@/gastos-fijos/actions";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    recurrenceDay: number | null;
  };
};

export function EditFixedExpenseForm({ expense }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount);
  const [recurrenceDay, setRecurrenceDay] = useState(String(expense.recurrenceDay ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateFixedExpense(expense.id, {
          description,
          amount,
          recurrenceDay: recurrenceDay ? Number(recurrenceDay) : undefined,
        });
        router.push("/gastos-fijos");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteFixedExpense(expense.id);
      router.push("/gastos-fijos");
    });
  }

  return (
    <>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ef-desc">Descripción</Label>
          <Input
            id="ef-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ef-amount">Monto estimado</Label>
            <Input
              id="ef-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ef-day">Día de vencimiento</Label>
            <Input
              id="ef-day"
              type="number"
              min="1"
              max="31"
              value={recurrenceDay}
              onChange={(e) => setRecurrenceDay(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </form>

      <button
        onClick={() => setDeleteOpen(true)}
        className="flex items-center gap-2 w-full justify-center py-3 text-sm text-destructive hover:bg-destructive/5 rounded-xl border border-destructive/20 transition-colors mt-2"
      >
        <Trash2 size={14} />
        Eliminar gasto fijo
      </button>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar gasto fijo?"
        description={`Se eliminará "${expense.description}" y todo su historial de pagos no podrá recuperarse.`}
        confirmText="Eliminar"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
