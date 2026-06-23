import { formatCurrency } from "@/shared/components/currency-display";
import type { CardPaymentDue } from "@/tarjetas/queries";

type Props = {
  payments: CardPaymentDue[];
  month: string; // 'YYYY-MM-01'
};

function formatShortDate(dateStr: string): string {
  const [, mm, dd] = dateStr.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(dd!)} ${months[parseInt(mm!) - 1]}`;
}

export function CardPaymentsWidget({ payments, month }: Props) {
  if (payments.length === 0) return null;

  const [y, m] = month.slice(0, 7).split("-").map(Number);

  return (
    <div
      className="rounded-[20px] bg-card border border-border p-4 flex flex-col gap-[13px]"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <span className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.3px] text-muted-foreground">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
          <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
        </svg>
        Pagos de tarjetas
      </span>

      <div className="flex flex-col gap-[13px]">
        {payments.map((p) => {
          const dueDateStr = `${y}-${String(m).padStart(2, "0")}-${String(p.paymentDueDay).padStart(2, "0")}`;
          const chipColor = p.cardColor ?? "#6366f1";

          return (
            <div key={p.cardId} className="flex items-center gap-3 py-1">
              <div
                className="w-[42px] h-[30px] rounded-[7px] flex items-end p-1 flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${chipColor}dd, ${chipColor}99)`,
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3)",
                }}
              >
                <span
                  className="w-[9px] h-[6px] rounded-[2px] block"
                  style={{ background: "rgba(255,255,255,0.55)" }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold">
                  {p.cardName}
                  {p.cardLastFour && (
                    <span className="text-[12px] font-normal text-muted-foreground num"> ···· {p.cardLastFour}</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {formatShortDate(p.billingStart)} – {formatShortDate(p.billingEnd)} · Vence{" "}
                  <span className="font-semibold text-foreground">{formatShortDate(dueDateStr)}</span>
                </div>
              </div>

              <div className="text-[20px] font-extrabold num flex-shrink-0">
                {formatCurrency(p.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
