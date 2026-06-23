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
};

export function PendingExpenseList({ items, categories }: Props) {
  const [confirmItem, setConfirmItem] = useState<PendingExpenseRow | null>(null);
  const [discardItem, setDiscardItem] = useState<PendingExpenseRow | null>(null);

  if (items.length === 0) {
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
        {items.map((item) => (
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
        open={confirmItem !== null}
        onClose={() => setConfirmItem(null)}
      />

      <DiscardConfirmDialog
        item={discardItem}
        open={discardItem !== null}
        onClose={() => setDiscardItem(null)}
      />
    </>
  );
}
