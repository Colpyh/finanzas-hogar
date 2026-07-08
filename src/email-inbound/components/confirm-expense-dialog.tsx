"use client";

import { useState, useTransition } from "react";
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
import type { PendingExpenseRow } from "@/shared/lib/db/schema";

type Category = { id: string; name: string };

type Props = {
  item: PendingExpenseRow | null;
  categories: Category[];
  open: boolean;
  onClose: () => void;
};

export function ConfirmExpenseDialog({
  item,
  categories,
  open,
  onClose,
}: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState(
    item?.parsedMerchant ?? ""
  );
  const [notes, setNotes] = useState("");
  const [categoryError, setCategoryError] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync description when item changes
  const effectiveDescription =
    description || item?.parsedMerchant || "";

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCategoryId("");
      setDescription(item?.parsedMerchant ?? "");
      setNotes("");
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

    startTransition(async () => {
      await confirmPendingExpense({
        pendingExpenseId: item.id,
        categoryId,
        description: effectiveDescription || item.parsedMerchant || "Gasto",
        notes: notes || undefined,
      });
      onClose();
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
                <SelectValue placeholder="Seleccionar categoría" />
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
