"use client";

import { useState, useTransition } from "react";
import { addCard, deleteCard } from "@/tarjetas/actions";
import { CARD_COLORS } from "@/tarjetas/types";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { CreditCard, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CardRow = {
  id: string;
  name: string;
  lastFour: string | null;
  color: string;
};

type Props = {
  cards: CardRow[];
};

function CardItem({ card }: { card: CardRow }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteCard(card.id);
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 py-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: card.color + "20" }}
        >
          <CreditCard size={14} style={{ color: card.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{card.name}</p>
          {card.lastFour && (
            <p className="text-xs text-muted-foreground">•••• {card.lastFour}</p>
          )}
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Eliminar tarjeta"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar tarjeta?"
        description={`Se eliminará "${card.name}" de las opciones de pago. Los gastos asociados no se verán afectados.`}
        confirmText="Eliminar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

function AddCardForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [color, setColor] = useState<string>(CARD_COLORS[0]?.value ?? "#6366f1");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCard({
        name,
        lastFour: lastFour || undefined,
        color,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-border">
      <div className="space-y-1.5">
        <Label htmlFor="card-name">Nombre</Label>
        <Input
          id="card-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Visa, Mastercard..."
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="card-last4">Últimos 4 dígitos (opcional)</Label>
        <Input
          id="card-last4"
          value={lastFour}
          onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="1234"
          inputMode="numeric"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex gap-2">
          {CARD_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c.value,
                borderColor: color === c.value ? c.value : "transparent",
                outline: color === c.value ? `2px solid ${c.value}` : "none",
                outlineOffset: "2px",
              }}
              aria-label={c.label}
            />
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          {isPending && <Loader2 size={13} className="mr-1.5 animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function CardManager({ cards }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-0">
      {cards.length > 0 ? (
        <div className="divide-y divide-border">
          {cards.map((c) => (
            <CardItem key={c.id} card={c} />
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="text-sm text-muted-foreground py-2">
            No hay tarjetas registradas.
          </p>
        )
      )}
      {showForm ? (
        <AddCardForm onClose={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 mt-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <Plus size={15} />
          Agregar tarjeta
        </button>
      )}
    </div>
  );
}
