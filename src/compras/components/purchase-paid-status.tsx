"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleExpensePaid } from "@/compras/actions";
import { toast } from "sonner";
import { Check } from "lucide-react";

// Rendered inside the PurchaseCard <Link>: el click NO debe navegar.
// Optimista: el badge pasa a "Pagado" al tap; si la action falla, revierte
// con toast. El estado del servidor re-sincroniza vía prop en el re-render.
export function PurchasePaidStatus({
  expenseId,
  initialPaid,
}: {
  expenseId: string;
  initialPaid: boolean;
}) {
  const [paid, setPaid] = useState(initialPaid);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPaid(initialPaid);
  }, [initialPaid]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPaid(true);
    startTransition(async () => {
      const result = await toggleExpensePaid(expenseId);
      if (result?.error) {
        setPaid(false);
        toast.error(result.error);
      }
    });
  }

  if (paid) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold px-[7px] py-[2px] rounded-full"
        style={{ background: "var(--success-bg)", color: "var(--success-fg)" }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M5 12l5 5L20 6" />
        </svg>
        Pagado
      </span>
    );
  }

  return (
    <>
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
        ⏳ Pendiente
      </span>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-[10.5px] font-bold px-[8px] py-[3px] rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
      >
        <Check size={10} />
        Marcar pagado
      </button>
    </>
  );
}
