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
    <Link
      href={`/gastos/${expense.id}`}
      className="flex items-center gap-3 px-4 py-[14px] border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0"
        style={{ background: "rgba(124,58,237,0.10)" }}
      >
        🛒
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-[14px] text-foreground truncate">{expense.description}</p>
          {expense.isPrivate && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              Privado
            </span>
          )}
        </div>
        <div className="flex items-center gap-[7px] mt-[4px] flex-wrap">
          {expense.expenseDate && (
            <span className="text-[11px] text-muted-foreground">{formatDate(expense.expenseDate)}</span>
          )}
          {expense.cardName && (
            <span
              className="text-[10.5px] font-bold px-[7px] py-[2px] rounded-[6px]"
              style={{
                color: expense.cardColor ?? "#7c3aed",
                background: `${expense.cardColor ?? "#7c3aed"}22`,
              }}
            >
              {expense.cardName}{expense.cardLastFour ? ` ···${expense.cardLastFour}` : ""}
            </span>
          )}
          {expense.categoryName && (
            <span className="text-[11px] text-muted-foreground">{expense.categoryName}</span>
          )}
          {expense.responsibleName && (
            <span className="text-[11px] font-medium text-primary/80">Paga: {expense.responsibleName}</span>
          )}
        </div>
      </div>

      <span className="text-[14.5px] font-extrabold text-foreground shrink-0 num">
        {formatCurrency(parseFloat(expense.amount))}
      </span>
    </Link>
  );
}
