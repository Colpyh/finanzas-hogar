"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

type Prefill = {
  desc: string;
  amount?: string | null;
  categoryId?: string | null;
  cardId?: string | null;
  responsibleId?: string | null;
};

// Rendered inside the PurchaseCard <Link>, so the click must NOT navigate
// to the detail page — it opens the new-purchase form prefilled instead.
export function RepeatPurchaseButton({ prefill }: { prefill: Prefill }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams({ tipo: "compra", desc: prefill.desc });
    if (prefill.amount) params.set("amount", prefill.amount);
    if (prefill.categoryId) params.set("categoryId", prefill.categoryId);
    if (prefill.cardId) params.set("cardId", prefill.cardId);
    if (prefill.responsibleId) params.set("responsibleId", prefill.responsibleId);
    router.push(`/compras/nuevo?${params.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Repetir esta compra"
      className="inline-flex items-center gap-1 text-[10.5px] font-bold px-[8px] py-[3px] rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      <RotateCcw size={10} />
      Repetir
    </button>
  );
}
