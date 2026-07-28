"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { confirmPendingExpense } from "@/email-inbound/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { toast } from "sonner";
import type { PendingExpenseRow } from "@/shared/lib/db/schema";

type Category = { id: string; name: string };

type Props = {
  item: PendingExpenseRow | null;
  categories: Category[];
  /** Categoría sugerida por historial — pre-seleccionada al abrir. */
  suggestedCategoryId?: string;
  /** Cantidad de miembros del hogar — oculta "Gasto compartido" si es 1. */
  memberCount?: number;
  open: boolean;
  onClose: () => void;
  /** Optimista: oculta la card al enviar; onRestore la devuelve si falla. */
  onOptimisticHide?: (id: string) => void;
  onRestore?: (id: string) => void;
};

export function ConfirmExpenseDialog({
  item,
  categories,
  suggestedCategoryId,
  memberCount = 1,
  open,
  onClose,
  onOptimisticHide,
  onRestore,
}: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState(
    item?.parsedMerchant ?? ""
  );
  const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Al abrir para un pendiente, RESETEAR todo el form: sembrar categoría
  // sugerida + descripción y limpiar notas. El cierre al confirmar es
  // programático (no dispara onOpenChange), así que sin este reset las notas
  // del gasto anterior quedaban pegadas en el siguiente.
  useEffect(() => {
    if (open) {
      setCategoryId(suggestedCategoryId ?? "");
      setDescription(item?.parsedMerchant ?? "");
      setNotes("");
      setIsPrivate(false);
      setIsShared(false);
      setCategoryError(false);
    }
  }, [open, suggestedCategoryId, item?.parsedMerchant]);

  // Sync description when item changes
  const effectiveDescription =
    description || item?.parsedMerchant || "";

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCategoryId("");
      setDescription(item?.parsedMerchant ?? "");
      setNotes("");
      setIsPrivate(false);
      setIsShared(false);
      setCategoryError(false);
      onClose();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      setCategoryError(true);
      return;
    }
    if (!item) return;
    setCategoryError(false);

    // Optimista: cerrar y ocultar la card YA — la action corre detrás.
    const itemId = item.id;
    const payload = {
      pendingExpenseId: itemId,
      categoryId,
      description: effectiveDescription || item.parsedMerchant || "Gasto",
      notes: notes || undefined,
      isPrivate,
      isShared,
    };
    onClose();
    onOptimisticHide?.(itemId);

    startTransition(async () => {
      const result = await confirmPendingExpense(payload);
      if (result?.error) {
        onRestore?.(itemId);
        toast.error(result.error);
      } else {
        toast.success("Gasto confirmado");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar gasto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description || item?.parsedMerchant || ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del gasto"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">
              Categoría <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger
                id="category"
                className={categoryError ? "border-destructive" : ""}
              >
                <SelectValue>
                  {(v: string | null) =>
                    categories.find((c) => c.id === v)?.name ?? "Seleccionar categoría"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && (
              <p className="text-xs text-destructive">
                La categoría es requerida
              </p>
            )}
            {!categoryError &&
              suggestedCategoryId &&
              categoryId === suggestedCategoryId && (
                <p className="text-xs text-muted-foreground">
                  ✨ Sugerida según tus gastos anteriores
                </p>
              )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {item?.parsedAmount && (
              <div>
                <span className="block text-xs">Monto</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(Number(item.parsedAmount))}
                </span>
              </div>
            )}
            {item?.parsedDate && (
              <div>
                <span className="block text-xs">Fecha</span>
                <span className="font-medium text-foreground">
                  {item.parsedDate
                    .split("-")
                    .reverse()
                    .join("/")}
                </span>
              </div>
            )}
          </div>

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

          {memberCount > 1 && (
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

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Confirmando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
