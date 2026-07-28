"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    isPrivate?: boolean;
    isShared?: boolean;
  };
  members: Member[];
  cards: CardOption[];
};

export function EditExpenseForm({ expense, members, cards }: Props) {
  const isInstallment = expense.type === "installment";
  const router = useRouter();

  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount ?? "");
  const [expenseDate, setExpenseDate] = useState(expense.expenseDate ?? "");
  const [responsibleId, setResponsibleId] = useState<string | null>(expense.responsibleId);
  const [cardId, setCardId] = useState<string | null>(expense.cardId);
  const [isPrivate, setIsPrivate] = useState(expense.isPrivate ?? false);
  const [isShared, setIsShared] = useState(expense.isShared ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateExpense(expense.id, {
        description,
        ...(isInstallment ? {} : { amount, expenseDate: expenseDate || null }),
        responsibleId: responsibleId ?? null,
        cardId: cardId ?? null,
        isPrivate,
        isShared,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Cambios guardados");
        router.push("/compras");
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

      {/* Privado / Compartido */}
      <button
        type="button"
        onClick={() => {
          setIsPrivate((v) => !v);
          setIsShared(false);
        }}
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
          isPrivate ? "border-primary/40 bg-primary/5" : "border-border bg-card"
        }`}
        disabled={isPending}
      >
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Gasto privado</p>
          <p className="text-xs text-muted-foreground mt-0.5">Solo tú lo verás</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isPrivate ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      {members.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsShared((v) => !v);
            setIsPrivate(false);
          }}
          className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
            isShared ? "border-primary/40 bg-primary/5" : "border-border bg-card"
          }`}
          disabled={isPending}
        >
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Gasto compartido</p>
            <p className="text-xs text-muted-foreground mt-0.5">Se divide con el resto del hogar — verás la deuda en Balances</p>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isShared ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isShared ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
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
  );
}
