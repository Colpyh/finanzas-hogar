"use client";

import { formatCurrency } from "@/shared/components/currency-display";
import { CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingExpense } from "@/shared/lib/db/schema";

type Props = {
  item: PendingExpense;
  onConfirm: (item: PendingExpense) => void;
  onDiscard: (item: PendingExpense) => void;
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function PendingExpenseCard({ item, onConfirm, onDiscard }: Props) {
  const amount =
    item.parsedAmount !== null ? Number(item.parsedAmount) : null;

  return (
    <div className="flex items-start gap-3 bg-card border border-border shadow-sm rounded-2xl px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {item.parsedMerchant ?? "—"}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.parsedDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={12} />
              {formatDate(item.parsedDate)}
            </span>
          )}
          {item.parsedCardLast4 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CreditCard size={12} />
              ****{item.parsedCardLast4}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="font-semibold text-sm text-foreground">
          {amount !== null ? formatCurrency(amount) : "—"}
        </span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="default"
            className="h-7 px-3 text-xs"
            onClick={() => onConfirm(item)}
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => onDiscard(item)}
          >
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}
