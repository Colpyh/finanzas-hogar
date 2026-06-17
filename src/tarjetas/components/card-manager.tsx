"use client";

import { useState, useTransition } from "react";
import { addCard, deleteCard, updateCard } from "@/tarjetas/actions";
import { CARD_COLORS } from "@/tarjetas/types";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatCurrency } from "@/shared/components/currency-display";
import { CreditCard, Plus, Trash2, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CardRow = {
  id: string;
  name: string;
  lastFour: string | null;
  color: string;
  creditLimit: number | null;
  closingDay: number | null;
  paymentDueDay: number | null;
  used: number;
  expenseCount: number;
};

type Props = {
  cards: CardRow[];
};

function UsageBar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = Math.min((used / limit) * 100, 100);
  const overLimit = used > limit;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatCurrency(used)} / {formatCurrency(limit)}
        </span>
        <span className={overLimit ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {overLimit ? "Excedido" : `${formatCurrency(limit - used)} disponible`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: overLimit ? "var(--destructive)" : color,
          }}
        />
      </div>
    </div>
  );
}

function CardFields({
  name, setName,
  lastFour, setLastFour,
  color, setColor,
  creditLimit, setCreditLimit,
  closingDay, setClosingDay,
  paymentDueDay, setPaymentDueDay,
}: {
  name: string; setName: (v: string) => void;
  lastFour: string; setLastFour: (v: string) => void;
  color: string; setColor: (v: string) => void;
  creditLimit: string; setCreditLimit: (v: string) => void;
  closingDay: string; setClosingDay: (v: string) => void;
  paymentDueDay: string; setPaymentDueDay: (v: string) => void;
}) {
  return (
    <>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="card-last4">Últimos 4 dígitos</Label>
          <Input
            id="card-last4"
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234 (opcional)"
            inputMode="numeric"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-limit">Tope mensual</Label>
          <Input
            id="card-limit"
            type="number"
            min="0"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="Opcional"
            className="h-10"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="card-closing">Día de cierre</Label>
          <Input
            id="card-closing"
            type="number"
            min="1"
            max="28"
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            placeholder="Ej: 25"
            inputMode="numeric"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-due">Día de pago</Label>
          <Input
            id="card-due"
            type="number"
            min="1"
            max="28"
            value={paymentDueDay}
            onChange={(e) => setPaymentDueDay(e.target.value)}
            placeholder="Ej: 10"
            inputMode="numeric"
            className="h-10"
          />
        </div>
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
    </>
  );
}

function CardItem({ card }: { card: CardRow }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteCard(card.id);
    });
  }

  if (editing) {
    return <EditCardInline card={card} onClose={() => setEditing(false)} />;
  }

  const deleteDescription =
    card.expenseCount > 0
      ? `"${card.name}" se quitará de las opciones de pago. ${card.expenseCount} gasto${card.expenseCount !== 1 ? "s" : ""} ya registrado${card.expenseCount !== 1 ? "s" : ""} conservará${card.expenseCount !== 1 ? "n" : ""} la referencia histórica, pero no podrás seleccionarla al cargar nuevos gastos.`
      : `"${card.name}" se quitará de las opciones de pago. No tiene gastos vinculados.`;

  return (
    <>
      <div className="py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: card.color + "20" }}
          >
            <CreditCard size={14} style={{ color: card.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{card.name}</p>
            <p className="text-xs text-muted-foreground">
              {card.lastFour && <span>•••• {card.lastFour}</span>}
              {card.lastFour && card.expenseCount > 0 && <span> · </span>}
              {card.expenseCount > 0 && (
                <span>
                  {card.expenseCount} gasto{card.expenseCount !== 1 ? "s" : ""} vinculado{card.expenseCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            disabled={isPending}
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Editar tarjeta"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar tarjeta"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {card.creditLimit ? (
          <UsageBar used={card.used} limit={card.creditLimit} color={card.color} />
        ) : card.used > 0 ? (
          <p className="text-xs text-muted-foreground pl-11">
            Usado este mes: <span className="font-medium text-foreground">{formatCurrency(card.used)}</span>
          </p>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar tarjeta?"
        description={deleteDescription}
        confirmText="Eliminar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

function EditCardInline({ card, onClose }: { card: CardRow; onClose: () => void }) {
  const [name, setName] = useState(card.name);
  const [lastFour, setLastFour] = useState(card.lastFour ?? "");
  const [color, setColor] = useState<string>(card.color);
  const [creditLimit, setCreditLimit] = useState(card.creditLimit != null ? String(card.creditLimit) : "");
  const [closingDay, setClosingDay] = useState(card.closingDay != null ? String(card.closingDay) : "");
  const [paymentDueDay, setPaymentDueDay] = useState(card.paymentDueDay != null ? String(card.paymentDueDay) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCard(card.id, {
        name,
        lastFour: lastFour || undefined,
        color,
        creditLimit: creditLimit || undefined,
        closingDay: closingDay ? parseInt(closingDay) : undefined,
        paymentDueDay: paymentDueDay ? parseInt(paymentDueDay) : undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="py-3 space-y-3 border-l-2 border-primary pl-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Editando</p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancelar"
        >
          <X size={14} />
        </button>
      </div>
      <CardFields
        name={name} setName={setName}
        lastFour={lastFour} setLastFour={setLastFour}
        color={color} setColor={setColor}
        creditLimit={creditLimit} setCreditLimit={setCreditLimit}
        closingDay={closingDay} setClosingDay={setClosingDay}
        paymentDueDay={paymentDueDay} setPaymentDueDay={setPaymentDueDay}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          {isPending && <Loader2 size={13} className="mr-1.5 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function AddCardForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [color, setColor] = useState<string>(CARD_COLORS[0]?.value ?? "#6366f1");
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
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
        creditLimit: creditLimit || undefined,
        closingDay: closingDay ? parseInt(closingDay) : undefined,
        paymentDueDay: paymentDueDay ? parseInt(paymentDueDay) : undefined,
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
      <CardFields
        name={name} setName={setName}
        lastFour={lastFour} setLastFour={setLastFour}
        color={color} setColor={setColor}
        creditLimit={creditLimit} setCreditLimit={setCreditLimit}
        closingDay={closingDay} setClosingDay={setClosingDay}
        paymentDueDay={paymentDueDay} setPaymentDueDay={setPaymentDueDay}
      />
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
