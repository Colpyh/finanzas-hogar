"use client";

import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { discardPendingExpense } from "@/email-inbound/actions";
import { toast } from "sonner";
import type { PendingExpenseRow } from "@/shared/lib/db/schema";

type Props = {
  item: PendingExpenseRow | null;
  open: boolean;
  onClose: () => void;
  onOptimisticHide?: (id: string) => void;
  onRestore?: (id: string) => void;
};

export function DiscardConfirmDialog({ item, open, onClose, onOptimisticHide, onRestore }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!item) return;
    // Optimista: cerrar y ocultar YA; restaurar con toast si la action falla.
    const itemId = item.id;
    onClose();
    onOptimisticHide?.(itemId);
    startTransition(async () => {
      try {
        await discardPendingExpense({ pendingExpenseId: itemId });
      } catch {
        onRestore?.(itemId);
        toast.error("No se pudo descartar — intentá de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Descartar gasto</DialogTitle>
          <DialogDescription>
            ¿Seguro? Esto descartará el gasto pendiente.
            {item?.parsedMerchant && (
              <span className="font-medium text-foreground">
                {" "}
                ({item.parsedMerchant})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Descartando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
