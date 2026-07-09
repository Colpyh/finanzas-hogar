"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiblePills } from "@/shared/components/responsible-pills";
import { CardPills } from "@/shared/components/card-pills";
import { formatCurrency } from "@/shared/components/currency-display";
import { createPurchaseSchema } from "@/compras/types";
import { createPurchase } from "@/compras/actions";
import type { ReceiptItem } from "@/receipts/types";
import { X } from "lucide-react";

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type Card = { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; used: number };
/** Valores iniciales (ej. "repetir compra" vía searchParams). */
type Initial = {
  description?: string;
  amount?: string;
  categoryId?: string;
  cardId?: string;
  responsibleId?: string;
  expenseDate?: string;
};
/** Datos de una boleta fotografiada — ítems editables + comprobante subido. */
type ReceiptData = {
  imagePath?: string;
  items: ReceiptItem[];
  itemsMatchTotal: boolean;
};
type Props = {
  categories: Category[];
  members: Member[];
  cards?: Card[];
  initial?: Initial;
  receipt?: ReceiptData;
};

// Última categoría/tarjeta/responsable usados — la compra diaria típica repite
// los mismos valores (mismo super, misma tarjeta).
const DEFAULTS_KEY = "fh:last-purchase-defaults";

export function PurchaseForm({ categories, members, cards = [], initial, receipt }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0] ?? "";
  const hasPrefill = Boolean(initial?.categoryId || initial?.description);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId && categories.some((c) => c.id === initial.categoryId)
      ? initial.categoryId
      : (categories[0]?.id ?? "")
  );
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [expenseDate, setExpenseDate] = useState(initial?.expenseDate ?? today);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>(receipt?.items ?? []);
  const [responsibleId, setResponsibleId] = useState<string | null>(
    initial?.responsibleId && members.some((m) => m.userId === initial.responsibleId)
      ? initial.responsibleId
      : null
  );
  const [cardId, setCardId] = useState<string | null>(
    initial?.cardId && cards.some((c) => c.id === initial.cardId) ? initial.cardId : null
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Sin prefill, arrancar con los últimos valores usados (en effect para no
  // divergir del HTML del servidor en la hidratación).
  useEffect(() => {
    if (hasPrefill) return;
    try {
      const raw = localStorage.getItem(DEFAULTS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Initial;
      if (saved.categoryId && categories.some((c) => c.id === saved.categoryId)) {
        setCategoryId(saved.categoryId);
      }
      if (saved.cardId && cards.some((c) => c.id === saved.cardId)) {
        setCardId(saved.cardId);
      }
      if (saved.responsibleId && members.some((m) => m.userId === saved.responsibleId)) {
        setResponsibleId(saved.responsibleId);
      }
    } catch {
      // localStorage bloqueado o JSON corrupto — defaults normales
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createPurchaseSchema.safeParse({
      description,
      categoryId,
      amount,
      currency: "CLP",
      expenseDate,
      responsibleId,
      cardId,
      isPrivate,
      ...(receipt
        ? {
            receiptItems: receiptItems.length > 0 ? receiptItems : undefined,
            receiptImagePath: receipt.imagePath,
          }
        : {}),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0]?.toString() ?? "general"] = i.message;
      });
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await createPurchase(parsed.data);
      try {
        localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ categoryId, cardId, responsibleId }));
      } catch {
        // sin localStorage no hay memoria de defaults, nada más
      }
      // Navegar al MES del gasto: una boleta vieja (ej. escaneada días después)
      // cae en otro mes y el usuario no la veía en la lista → reintentaba y
      // duplicaba. Aterrizar donde quedó lo guardado.
      router.push(`/compras?month=${expenseDate.slice(0, 7)}-01`);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Error al guardar" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="desc">Descripción</Label>
        <Input
          id="desc"
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Supermercado"
          disabled={loading}
          className="h-11"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger className="w-full h-11 rounded-xl px-3 text-sm">
            <SelectValue>
              {(v: string | null) => categories.find((c) => c.id === v)?.name ?? "Seleccionar categoría"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto (CLP)</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ej: 45000"
          disabled={loading}
          className="h-11"
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          disabled={loading}
          className="h-11"
        />
      </div>

      {receipt && receiptItems.length > 0 && (
        <div className="space-y-1.5">
          <Label>Detalle de la boleta ({receiptItems.length} ítems)</Label>
          {!receipt.itemsMatchTotal && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
              ⚠️ El detalle no cuadra con el total impreso — revisá los ítems (el total de arriba es el que vale).
            </p>
          )}
          <div
            className="rounded-xl border border-border overflow-hidden divide-y divide-border"
            style={{ background: "var(--card-2)" }}
          >
            {receiptItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={item.description}
                  onChange={(e) =>
                    setReceiptItems((prev) =>
                      prev.map((it, j) => (j === i ? { ...it, description: e.target.value } : it))
                    )
                  }
                  className="flex-1 min-w-0 bg-transparent text-xs text-foreground outline-none"
                  disabled={loading}
                />
                {item.quantity != null && item.quantity > 1 && (
                  <span className="text-[11px] text-muted-foreground shrink-0">×{item.quantity}</span>
                )}
                <span className="text-xs font-semibold num shrink-0">{formatCurrency(item.total)}</span>
                <button
                  type="button"
                  onClick={() => setReceiptItems((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label="Quitar ítem"
                  disabled={loading}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length > 0 && (
        <div className="space-y-1.5">
          <Label>Responsable de pago</Label>
          <ResponsiblePills
            members={members}
            value={responsibleId}
            onChange={setResponsibleId}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">¿Quién paga físicamente este gasto?</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="space-y-1.5">
          <Label>Tarjeta</Label>
          <CardPills
            cards={cards}
            value={cardId}
            onChange={setCardId}
            disabled={loading}
          />
        </div>
      )}

      {errors.general && (
        <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
          {errors.general}
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsPrivate((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
          isPrivate ? "border-primary/40 bg-primary/5" : "border-border bg-card"
        }`}
        disabled={loading}
      >
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Gasto privado</p>
          <p className="text-xs text-muted-foreground mt-0.5">Solo tú lo verás</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isPrivate ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
        {loading ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
