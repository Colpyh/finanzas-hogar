"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { uploadReceiptImage } from "@/receipts/actions";
import { compressImage } from "@/receipts/lib/compress-image";
import type { ReceiptItem } from "@/receipts/types";
import { ImagePlus, Loader2, X } from "lucide-react";

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

/** Fecha de HOY en la zona horaria local del navegador (no UTC — de noche en
 * Chile, toISOString() ya cae en el día siguiente y precargaba mal la fecha). */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function PurchaseForm({ categories, members, cards = [], initial, receipt }: Props) {
  const router = useRouter();
  const today = todayLocal();
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
  const [isShared, setIsShared] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Guard SINCRÓNICO contra doble-submit: el estado `loading` no alcanza a
  // deshabilitar el botón ante un doble tap rápido (React re-renderiza después).
  const submittingRef = useRef(false);
  // Imagen simple de respaldo (sin IA) — solo en el alta manual, no cuando ya
  // viene de la boleta escaneada (esa trae su propia imagen en `receipt`).
  const [attachedImage, setAttachedImage] = useState<{ path: string; previewUrl: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleAttachImage(file: File) {
    setImageError(null);
    setImageUploading(true);
    try {
      // Sin IA de por medio no hace falta legibilidad de texto — se puede
      // comprimir más que en el flujo de "Foto de boleta" (1280px/0.82).
      const { base64, dataUrl } = await compressImage(file, { maxSize: 1000, quality: 0.72 });
      const res = await uploadReceiptImage(base64, "image/jpeg");
      if (res.error || !res.imagePath) {
        setImageError(res.error ?? "No se pudo subir la imagen");
        return;
      }
      setAttachedImage({ path: res.imagePath, previewUrl: dataUrl });
    } catch {
      setImageError("No se pudo procesar la imagen — probá de nuevo.");
    } finally {
      setImageUploading(false);
    }
  }

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
    if (submittingRef.current) return;
    const parsed = createPurchaseSchema.safeParse({
      description,
      categoryId,
      amount,
      currency: "CLP",
      expenseDate,
      responsibleId,
      cardId,
      isPrivate,
      isShared,
      ...(receipt
        ? {
            receiptItems: receiptItems.length > 0 ? receiptItems : undefined,
            receiptImagePath: receipt.imagePath,
          }
        : attachedImage
          ? { receiptImagePath: attachedImage.path }
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
    submittingRef.current = true;
    setLoading(true);
    const result = await createPurchase(parsed.data);
    if (result?.error) {
      setErrors({ general: result.error });
      submittingRef.current = false;
      setLoading(false);
      return;
    }
    try {
      localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ categoryId, cardId, responsibleId }));
    } catch {
      // sin localStorage no hay memoria de defaults, nada más
    }
    // Navegar al MES del gasto: una boleta vieja (ej. escaneada días después)
    // cae en otro mes y el usuario no la veía en la lista → reintentaba y
    // duplicaba. Aterrizar donde quedó lo guardado.
    router.push(`/compras?month=${expenseDate.slice(0, 7)}-01`);
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

      {!receipt && (
        <div className="space-y-1.5">
          <Label>Foto de respaldo (opcional)</Label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleAttachImage(f);
              e.target.value = "";
            }}
          />
          {attachedImage ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- dataURL local, no optimizable */}
              <img
                src={attachedImage.previewUrl}
                alt="Respaldo del gasto"
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
              <p className="flex-1 text-xs text-muted-foreground">Imagen adjuntada</p>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Quitar imagen"
                disabled={loading}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading || imageUploading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              {imageUploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ImagePlus size={15} />
              )}
              {imageUploading ? "Subiendo..." : "Adjuntar imagen"}
            </button>
          )}
          {imageError && <p className="text-xs text-destructive">{imageError}</p>}
        </div>
      )}

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
                  onClick={() => {
                    const removedItem = item;
                    const removedIndex = i;
                    setReceiptItems((prev) => prev.filter((_, j) => j !== removedIndex));
                    // Al sacar un ítem, restar su valor del monto total en vez de
                    // recalcularlo desde cero — así no se pisa un ajuste manual
                    // que el usuario ya haya hecho en el campo de arriba.
                    setAmount((prev) => {
                      const current = parseFloat(prev) || 0;
                      return String(Math.max(0, current - removedItem.total));
                    });
                    toast(`Ítem quitado: ${removedItem.description}`, {
                      action: {
                        label: "Deshacer",
                        onClick: () => {
                          setReceiptItems((prev) => {
                            const next = [...prev];
                            next.splice(removedIndex, 0, removedItem);
                            return next;
                          });
                          setAmount((prev) => String((parseFloat(prev) || 0) + removedItem.total));
                        },
                      },
                    });
                  }}
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
        onClick={() => {
          setIsPrivate((v) => !v);
          setIsShared(false);
        }}
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
          disabled={loading}
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

      <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
        {loading ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
