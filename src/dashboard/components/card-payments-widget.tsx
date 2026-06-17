import { formatCurrency } from "@/shared/components/currency-display";
import { CreditCard } from "lucide-react";
import type { CardPaymentDue } from "@/tarjetas/queries";

type Props = {
  payments: CardPaymentDue[];
  month: string; // 'YYYY-MM-01'
};

function formatShortDate(dateStr: string): string {
  const [, mm, dd] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(dd!)} ${months[parseInt(mm!) - 1]}`;
}

export function CardPaymentsWidget({ payments, month }: Props) {
  if (payments.length === 0) return null;

  const monthYear = month.slice(0, 7);
  const [y, m] = monthYear.split("-").map(Number);

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Pagos de tarjetas</h2>

      <ul className="space-y-3">
        {payments.map((p) => {
          const dueDateStr = `${y}-${String(m).padStart(2, "0")}-${String(p.paymentDueDay).padStart(2, "0")}`;

          return (
            <li key={p.cardId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: p.cardColor + "20" }}
                  >
                    <CreditCard size={12} style={{ color: p.cardColor }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {p.cardName}
                    {p.cardLastFour && (
                      <span className="text-muted-foreground font-normal"> ···· {p.cardLastFour}</span>
                    )}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(p.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between pl-8 text-xs text-muted-foreground">
                <span>
                  {formatShortDate(p.billingStart)} – {formatShortDate(p.billingEnd)}
                </span>
                <span>
                  Vence{" "}
                  <span className="font-medium text-foreground">
                    {formatShortDate(dueDateStr)}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
