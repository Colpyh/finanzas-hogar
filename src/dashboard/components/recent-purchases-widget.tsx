import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";
import type { RecentPurchase } from "@/dashboard/types";

type Props = {
  purchases: RecentPurchase[];
  currentUserId?: string;
  memberNames?: Record<string, string>;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-419", { day: "numeric", month: "short" });
}

export function RecentPurchasesWidget({ purchases }: Props) {
  return (
    <div
      className="rounded-[20px] bg-card border border-border p-4 flex flex-col gap-[13px]"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.3px] text-muted-foreground">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary">
            <circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>
            <path d="M2 3h3l2.5 13h11l2-9H6"/>
          </svg>
          Últimas compras
        </span>
        <Link href="/compras" className="text-[11px] font-semibold text-primary">
          Ver todas ›
        </Link>
      </div>

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin compras este mes</p>
      ) : (
        <div>
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between gap-[10px] py-[10px] border-b border-border last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-[11px] min-w-0">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[15px] flex-shrink-0"
                  style={{ background: "var(--muted)" }}
                >
                  🛒
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{purchase.description}</div>
                  {purchase.expenseDate && (
                    <div className="text-[11px] text-muted-foreground mt-[1px]">
                      {formatDate(purchase.expenseDate)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[16px] font-extrabold num flex-shrink-0">
                {formatCurrency(purchase.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
