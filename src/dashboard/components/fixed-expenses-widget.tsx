import { formatCurrency } from "@/shared/components/currency-display";
import type { FixedBillWithStatus } from "@/dashboard/types";

type Props = {
  bills: FixedBillWithStatus[];
  currentUserId?: string;
  memberNames?: Record<string, string>;
};

export function FixedExpensesWidget({ bills }: Props) {
  // currentUserId and memberNames kept for API compatibility
  const paid = bills.filter((b) => b.paid).length;

  return (
    <div
      className="rounded-[20px] bg-card border border-border p-4 flex flex-col gap-[13px]"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.3px] text-muted-foreground">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2-3-2V4a1 1 0 0 1 1-1z"/>
            <path d="M9 8h6M9 12h6"/>
          </svg>
          Gastos Fijos
        </span>
        {bills.length > 0 && (
          <span className="flex items-center gap-[6px] text-[11px] font-semibold text-muted-foreground">
            <span className="flex gap-[3px]">
              {bills.map((b, i) => (
                <i
                  key={i}
                  className="not-italic w-[6px] h-[6px] rounded-full"
                  style={{ background: b.paid ? "var(--success-line)" : "var(--border-strong)" }}
                />
              ))}
            </span>
            {paid} de {bills.length} pagados
          </span>
        )}
      </div>

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin gastos fijos registrados</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bills.map((bill) => (
            <li
              key={bill.id}
              className="flex items-center gap-[11px] py-[9px] pr-[10px] pl-2 rounded-xl border relative overflow-hidden"
              style={{
                background: "var(--card-2)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{
                  background: bill.paid ? "var(--success-line)" : "var(--pending-line)",
                }}
              />
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-base flex-shrink-0 ml-1"
                style={{ background: "var(--muted)" }}
              >
                🧾
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold truncate">{bill.description}</div>
                <div className="flex items-center gap-[7px] mt-[3px]">
                  {bill.paid ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--success-bg)", color: "var(--success-fg)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M5 12l5 5L20 6"/>
                      </svg>
                      Pagado
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Sin pagar</span>
                  )}
                </div>
              </div>
              <div
                className="text-[16px] font-extrabold text-right num flex-shrink-0"
                style={{ color: bill.paid ? "var(--muted-foreground)" : undefined }}
              >
                {formatCurrency(bill.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
