"use client";

import { useState } from "react";
import { PendingExpenseCard } from "./pending-expense-card";
import { ConfirmExpenseDialog } from "./confirm-expense-dialog";
import { DiscardConfirmDialog } from "./discard-confirm-dialog";
import { Inbox } from "lucide-react";
import type { PendingExpense } from "@/shared/lib/db/schema";

type Category = { id: string; name: string };

type Props = {
  items: PendingExpense[];
  categories: Category[];
};

export function PendingExpenseList({ items, categories }: Props) {
  const [confirmItem, setConfirmItem] = useState<PendingExpense | null>(null);
  const [discardItem, setDiscardItem] = useState<PendingExpense | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Inbox size={40} strokeWidth={1.25} />
        <p className="text-sm">No hay gastos pendientes</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <PendingExpenseCard
              item={item}
              onConfirm={setConfirmItem}
              onDiscard={setDiscardItem}
            />
          </li>
        ))}
      </ul>

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
