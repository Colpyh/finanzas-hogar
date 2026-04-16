"use client";

import { useState, useTransition } from "react";
import { updateExpenseCard } from "@/compras/actions";
import { Button } from "@/components/ui/button";
import { CreditCard, X, Check } from "lucide-react";

type CardOption = {
  id: string;
  name: string;
  color: string;
  lastFour: string | null;
};

type Props = {
  expenseId: string;
  currentCardId: string | null;
  cards: CardOption[];
};

export function ExpenseCardSelector({ expenseId, currentCardId, cards }: Props) {
  const [selected, setSelected] = useState<string | null>(currentCardId);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentCard = cards.find((c) => c.id === selected) ?? null;

  function handleSave(cardId: string | null) {
    startTransition(async () => {
      await updateExpenseCard(expenseId, cardId);
      setSelected(cardId);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Tarjeta</span>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          {currentCard ? (
            <>
              <CreditCard size={14} style={{ color: currentCard.color }} />
              <span>{currentCard.name}</span>
              {currentCard.lastFour && (
                <span className="text-muted-foreground">·{currentCard.lastFour}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Sin tarjeta</span>
          )}
          <span className="text-xs text-primary ml-1">Editar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Seleccionar tarjeta</p>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => handleSave(null)}
          disabled={pending}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors text-muted-foreground"
        >
          <X size={14} />
          Sin tarjeta
          {selected === null && <Check size={13} className="ml-auto text-primary" />}
        </button>
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSave(c.id)}
            disabled={pending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
          >
            <CreditCard size={14} style={{ color: c.color }} />
            <span>{c.name}</span>
            {c.lastFour && <span className="text-muted-foreground">·{c.lastFour}</span>}
            {selected === c.id && <Check size={13} className="ml-auto text-primary" />}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setEditing(false)}
        className="text-muted-foreground w-full"
      >
        Cancelar
      </Button>
    </div>
  );
}
