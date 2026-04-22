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
    cardName?: string | null;
    cardColor?: string | null;
    cardLastFour?: string | null;
    isPrivate?: boolean;
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
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-foreground truncate">{expense.description}</p>
            {expense.isPrivate && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">Privado</span>
            )}
          </div>
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
            {expense.cardName && (
              <>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: expense.cardColor ?? undefined }}
                >
                  {expense.cardName}{expense.cardLastFour ? ` ···· ${expense.cardLastFour}` : ""}
                </span>
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
