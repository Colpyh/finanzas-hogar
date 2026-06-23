"use client";

import { formatCurrency } from "@/shared/components/currency-display";
import type { PendingExpenseRow } from "@/shared/lib/db/schema";

type Props = {
  item: PendingExpenseRow;
  onConfirm: (item: PendingExpenseRow) => void;
  onDiscard: (item: PendingExpenseRow) => void;
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function PendingExpenseCard({ item, onConfirm, onDiscard }: Props) {
  const amount = item.parsedAmount !== null ? Number(item.parsedAmount) : null;

  return (
    <div
      className="bg-card border border-border rounded-[18px] p-[15px]"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-[13px] flex items-center justify-center text-[20px] flex-shrink-0"
          style={{ background: "rgba(124,58,237,0.10)" }}
        >
          🏪
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-foreground truncate">
            {item.parsedMerchant ?? "—"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-[2px]">
            {item.parsedDate ? formatDate(item.parsedDate) : ""}
            {item.parsedDate && item.parsedCardLast4 ? " · " : ""}
            {item.parsedCardLast4 ? `BCI ••${item.parsedCardLast4}` : ""}
          </p>
        </div>
        <span className="text-[16px] font-extrabold text-foreground shrink-0 num">
          {amount !== null ? formatCurrency(amount) : "—"}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-[9px] mt-[13px]">
        <button
          type="button"
          onClick={() => onConfirm(item)}
          className="flex-1 text-[13px] font-bold text-white py-[10px] rounded-[11px] cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#8b46f0,#6d28d9)", border: "none" }}
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => onDiscard(item)}
          className="text-[13px] font-bold text-muted-foreground px-4 py-[10px] rounded-[11px] border border-border bg-card cursor-pointer hover:bg-muted/60 transition-colors"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
