"use client";

import { useState } from "react";
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
import { markFixedExpensePaid } from "@/gastos-fijos/actions";

type Props = {
  expenseId: string;
  estimatedAmount: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MarkPaidDialog({
  expenseId,
  estimatedAmount,
  open,
  onOpenChange,
}: Props) {
  const [amount, setAmount] = useState(estimatedAmount);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const result = await markFixedExpensePaid({ expenseId, amount, notes: notes || undefined });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="paid-amount">Monto pagado</Label>
            <Input
              id="paid-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Estimado: ${estimatedAmount}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="paid-notes">Notas (opcional)</Label>
            <Input
              id="paid-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pagado con débito"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Guardando..." : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
