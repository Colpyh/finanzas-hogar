import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";
import { ChevronRight } from "lucide-react";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    expenseDate: string | null;
    categoryName?: string;
    responsibleName?: string | null;
  };
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function PurchaseCard({ expense }: Props) {
  return (
    <Link href={`/gastos/${expense.id}`}>
      <div className="flex items-center gap-3 bg-card border border-border shadow-sm rounded-2xl px-4 py-3.5 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{expense.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {expense.categoryName && (
              <span className="text-xs text-muted-foreground">{expense.categoryName}</span>
            )}
            {expense.expenseDate && expense.categoryName && (
              <span className="text-xs text-muted-foreground/50">·</span>
            )}
            {expense.expenseDate && (
              <span className="text-xs text-muted-foreground">
                {formatDate(expense.expenseDate)}
              </span>
            )}
            {expense.responsibleName && (
              <>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs font-medium text-primary/80">Paga: {expense.responsibleName}</span>
              </>
            )}
          </div>
        </div>
        <span className="text-sm font-semibold text-foreground shrink-0">
          {formatCurrency(parseFloat(expense.amount))}
        </span>
        <ChevronRight size={14} className="text-muted-foreground/60 shrink-0" />
      </div>
    </Link>
  );
}
