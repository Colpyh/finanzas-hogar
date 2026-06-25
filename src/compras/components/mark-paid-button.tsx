"use client";

import { useTransition } from "react";
import { toggleExpensePaid } from "@/compras/actions";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";

// Rendered inside the PurchaseCard <Link>, so the click must NOT navigate.
export function MarkPaidButton({ expenseId }: { expenseId: string }) {
  const [pending, start] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const result = await toggleExpensePaid(expenseId);
      if (result?.error) toast.error(result.error);
      else toast.success("Compra marcada como pagada");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1 text-[10.5px] font-bold px-[8px] py-[3px] rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
    >
      {pending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
      Marcar pagado
    </button>
  );
}
