"use client";

import { useState, useTransition } from "react";
import { updateExpense } from "@/compras/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, User, X } from "lucide-react";

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
      try {
        await updateExpense(expense.id, {
          description,
          ...(isInstallment ? {} : { amount, expenseDate: expenseDate || null }),
          responsibleId: responsibleId ?? null,
          cardId: cardId ?? null,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setResponsibleId(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                responsibleId === null
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <User size={12} />
              Sin asignar
            </button>
            {members.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => setResponsibleId(m.userId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  responsibleId === m.userId
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {m.displayName.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="space-y-1.5">
        <Label>Tarjeta</Label>
        {cards.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin tarjetas registradas.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCardId(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                cardId === null
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <X size={12} />
              Sin tarjeta
            </button>
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCardId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  cardId === c.id
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
                style={cardId === c.id ? { backgroundColor: c.color } : undefined}
              >
                <CreditCard size={12} style={cardId !== c.id ? { color: c.color } : undefined} />
                {c.name}
                {c.lastFour && <span className="opacity-70">···{c.lastFour}</span>}
              </button>
            ))}
          </div>
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
