"use client";

import { useState } from "react";
import { PendingExpenseCard } from "./pending-expense-card";
import { ConfirmExpenseDialog } from "./confirm-expense-dialog";
import { DiscardConfirmDialog } from "./discard-confirm-dialog";
import type { PendingExpenseRow } from "@/shared/lib/db/schema";

type Category = { id: string; name: string };

type Props = {
  items: PendingExpenseRow[];
  categories: Category[];
  /** id del pendiente → categoryId sugerida por historial (opcional). */
  suggestions?: Record<string, string>;
};

export function PendingExpenseList({
  items,
  categories,
  suggestions = {},
}: Props) {
  const [confirmItem, setConfirmItem] = useState<PendingExpenseRow | null>(null);
  const [discardItem, setDiscardItem] = useState<PendingExpenseRow | null>(null);
  // Optimista: la card desaparece al confirmar/descartar sin esperar el
  // roundtrip; si la action falla, se restaura (y el diálogo muestra toast).
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());

  const hide = (id: string) => setHiddenIds((prev) => new Set(prev).add(id));
  const restore = (id: string) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const visible = items.filter((i) => !hiddenIds.has(i.id));

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
        <span className="text-[46px]">✅</span>
        <p className="text-[16px] font-extrabold text-foreground mt-3" style={{ letterSpacing: "-0.01em" }}>
          Todo al día
        </p>
        <p className="text-[13px] text-muted-foreground mt-1">No hay gastos por confirmar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-[18px] items-start">
        {visible.map((item) => (
          <PendingExpenseCard
            key={item.id}
            item={item}
            onConfirm={setConfirmItem}
            onDiscard={setDiscardItem}
          />
        ))}
      </div>

      <ConfirmExpenseDialog
        item={confirmItem}
        categories={categories}
        suggestedCategoryId={confirmItem ? suggestions[confirmItem.id] : undefined}
        open={confirmItem !== null}
        onClose={() => setConfirmItem(null)}
        onOptimisticHide={hide}
        onRestore={restore}
      />

      <DiscardConfirmDialog
        item={discardItem}
        open={discardItem !== null}
        onClose={() => setDiscardItem(null)}
        onOptimisticHide={hide}
        onRestore={restore}
      />
    </>
  );
}
