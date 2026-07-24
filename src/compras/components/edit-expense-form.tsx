"use client";

import { useState, useTransition } from "react";
import { updateExpense } from "@/compras/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiblePills } from "@/shared/components/responsible-pills";
import { CardPills } from "@/shared/components/card-pills";
import { Loader2 } from "lucide-react";

type Member = { userId: string; displayName: string };
type CardOption = { id: string; name: string; color: string; lastFour: string | null };

type Props = {
  expense: {
    id: string;
    type: string;
    description: string;
    amount: string | null;
    expenseDate: string | null;
    responsibleId: string | null;
    cardId: string | null;
  };
  members: Member[];
  cards: CardOption[];
};

export function EditExpenseForm({ expense, members, cards }: Props) {
  const isInstallment = expense.type === "installment";

  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount ?? "");
  const [expenseDate, setExpenseDate] = useState(expense.expenseDate ?? "");
  const [responsibleId, setResponsibleId] = useState<string | null>(expense.responsibleId);
  const [cardId, setCardId] = useState<string | null>(expense.cardId);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateExpense(expense.id, {
        description,
        ...(isInstallment ? {} : { amount, expenseDate: expenseDate || null }),
        responsibleId: responsibleId ?? null,
        cardId: cardId ?? null,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="ef-desc">Descripción</Label>
        <Input
          id="ef-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Amount + Date — only for one_time */}
      {!isInstallment && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ef-amount">Monto</Label>
            <Input
              id="ef-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ef-date">Fecha</Label>
            <Input
              id="ef-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      )}

      {/* Responsible */}
      {members.length > 0 && (
        <div className="space-y-1.5">
          <Label>Responsable de pago</Label>
          <ResponsiblePills
            members={members}
            value={responsibleId}
            onChange={setResponsibleId}
            disabled={isPending}
          />
        </div>
      )}

      {/* Card */}
      <div className="space-y-1.5">
        <Label>Tarjeta</Label>
        {cards.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin tarjetas registradas.</p>
        ) : (
          <CardPills
            cards={cards}
            value={cardId}
            onChange={setCardId}
            disabled={isPending}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Cambios guardados</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
        Guardar cambios
      </Button>
    </form>
  );
}
