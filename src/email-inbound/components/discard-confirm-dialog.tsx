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
import type { PendingExpense } from "@/shared/lib/db/schema";

type Props = {
  item: PendingExpense | null;
  open: boolean;
  onClose: () => void;
};

export function DiscardConfirmDialog({ item, open, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!item) return;
    startTransition(async () => {
      await discardPendingExpense({ pendingExpenseId: item.id });
      onClose();
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
