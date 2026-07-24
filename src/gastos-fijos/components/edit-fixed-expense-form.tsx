"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateFixedExpense, deleteFixedExpense } from "@/gastos-fijos/actions";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { CardPills } from "@/shared/components/card-pills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";

type Card = { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; used: number };

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    type: string;
    recurrenceDay: number | null;
    cardId: string | null;
  };
  cards?: Card[];
};

export function EditFixedExpenseForm({ expense, cards = [] }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState(expense.description);
  const [expenseType, setExpenseType] = useState<"fixed" | "variable">(
    expense.type === "variable" ? "variable" : "fixed"
  );
  const [amount, setAmount] = useState(expense.amount === "0" ? "" : expense.amount);
  const [recurrenceDay, setRecurrenceDay] = useState(String(expense.recurrenceDay ?? ""));
  const [cardId, setCardId] = useState<string | null>(expense.cardId);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateFixedExpense(expense.id, {
        description,
        type: expenseType,
        amount: expenseType === "variable" ? "0" : amount,
        recurrenceDay: recurrenceDay ? Number(recurrenceDay) : undefined,
        cardId,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Cambios guardados");
        router.push("/gastos-fijos");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        const result = await deleteFixedExpense(expense.id);
        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/gastos-fijos");
        }
      } catch {
        setError("Error al eliminar el gasto. Intentá de nuevo.");
      }
      setDeleteOpen(false);
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
        <div className="space-y-1.5">
          <Label>Tipo de monto</Label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setExpenseType("fixed")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                expenseType === "fixed"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              Monto fijo
            </button>
            <button
              type="button"
              onClick={() => setExpenseType("variable")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                expenseType === "variable"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              Varía cada mes
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {expenseType === "fixed" && (
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
          )}
          <div className={`space-y-1.5 ${expenseType === "variable" ? "col-span-2" : ""}`}>
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

        {cards.length > 0 && (
          <div className="space-y-1.5">
            <Label>Tarjeta vinculada</Label>
            <CardPills cards={cards} value={cardId} onChange={setCardId} />
            <p className="text-xs text-muted-foreground">Opcional — tarjeta con la que se paga este gasto</p>
          </div>
        )}

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
