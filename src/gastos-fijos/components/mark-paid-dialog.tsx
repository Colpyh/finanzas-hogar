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
import { formatCurrency } from "@/shared/components/currency-display";
import { toast } from "sonner";
import { PiggyBank, CheckCircle2 } from "lucide-react";

type Props = {
  expenseId: string;
  estimatedAmount: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodMonth: string;
  /** Optimista: la card refleja el pago al enviar; onError revierte. */
  onOptimistic?: (status: "reserved" | "paid") => void;
  onError?: () => void;
};

export function MarkPaidDialog({
  expenseId,
  estimatedAmount,
  open,
  onOpenChange,
  periodMonth,
  onOptimistic,
  onError,
}: Props) {
  const [amount, setAmount] = useState(estimatedAmount === "0" ? "" : estimatedAmount);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(status: "reserved" | "paid") {
    setError(null);

    // Validación mínima local antes de cerrar optimista (evita cerrar y
    // reabrir por un monto vacío, el error más común).
    if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError("Ingresá un monto válido");
      return;
    }

    // Optimista: cerrar YA y reflejar el pago en la card; revert en error.
    const payload = { expenseId, amount, status, notes: notes || undefined, periodMonth };
    onOpenChange(false);
    onOptimistic?.(status);

    const result = await markFixedExpensePaid(payload);
    if (result?.error) {
      onError?.();
      toast.error(result.error);
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
            <Label htmlFor="paid-amount">Monto</Label>
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
              Estimado: {formatCurrency(parseFloat(estimatedAmount) || 0)}
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="sm:mr-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit("reserved")}
            disabled={loading}
            className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            <PiggyBank size={15} />
            {loading ? "Guardando..." : "Guardar en chanchito"}
          </Button>
          <Button
            onClick={() => handleSubmit("paid")}
            disabled={loading}
            className="gap-2"
          >
            <CheckCircle2 size={15} />
            {loading ? "Guardando..." : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
