import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";
import { PurchasePaidStatus } from "./purchase-paid-status";
import { RepeatPurchaseButton } from "./repeat-purchase-button";
import { cn } from "@/lib/utils";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    expenseDate: string | null;
    categoryId?: string | null;
    categoryName?: string;
    responsibleId?: string | null;
    responsibleName?: string | null;
    cardId?: string | null;
    cardKind?: string | null;
    cardName?: string | null;
    cardColor?: string | null;
    cardLastFour?: string | null;
    isPrivate?: boolean;
    isShared?: boolean;
    paidAt?: string | null;
  };
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function PurchaseCard({ expense }: Props) {
  // Sin tarjeta o con tarjeta de DÉBITO = pagada al instante (el dinero ya
  // salió). Con crédito = pendiente hasta que se marque (paid_at).
  const isPaid = !expense.cardId || expense.cardKind === "debit" || expense.paidAt != null;

  return (
    <Link
      href={`/gastos/${expense.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-[14px] border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer",
        isPaid && "opacity-60"
      )}
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
          {expense.isShared && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
              Compartido
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
          {/* Estado de pago (optimista: badge cambia al tap) */}
          <PurchasePaidStatus expenseId={expense.id} initialPaid={isPaid} />
          <RepeatPurchaseButton
            prefill={{
              desc: expense.description,
              amount: expense.amount,
              categoryId: expense.categoryId,
              cardId: expense.cardId,
              responsibleId: expense.responsibleId,
            }}
          />
        </div>
      </div>

      <span
        className={cn(
          "text-[14.5px] font-extrabold shrink-0 num",
          isPaid ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {formatCurrency(parseFloat(expense.amount))}
      </span>
    </Link>
  );
}
