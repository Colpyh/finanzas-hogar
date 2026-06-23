import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";

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
      <div
        className="flex items-center gap-3 bg-card border border-border rounded-[20px] px-4 py-3.5 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base flex-shrink-0"
          style={{ background: "var(--muted)" }}
        >
          🛒
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[13.5px] text-foreground truncate">{expense.description}</p>
            {expense.isPrivate && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                Privado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {expense.expenseDate && (
              <span className="text-[11px] text-muted-foreground">{formatDate(expense.expenseDate)}</span>
            )}
            {expense.categoryName && (
              <>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] text-muted-foreground">{expense.categoryName}</span>
              </>
            )}
            {expense.responsibleName && (
              <>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] font-medium text-primary/80">Paga: {expense.responsibleName}</span>
              </>
            )}
            {expense.cardName && (
              <>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: expense.cardColor ?? undefined }}
                >
                  {expense.cardName}{expense.cardLastFour ? ` ···· ${expense.cardLastFour}` : ""}
                </span>
              </>
            )}
          </div>
        </div>

        <span className="text-[16px] font-extrabold text-foreground shrink-0 num">
          {formatCurrency(parseFloat(expense.amount))}
        </span>
      </div>
    </Link>
  );
}
