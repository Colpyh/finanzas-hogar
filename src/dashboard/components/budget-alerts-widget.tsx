import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";
import type { CategoryBudgetStatus } from "@/categories/types";

type Props = {
  categories: CategoryBudgetStatus[];
};

function statusClass(pct: number) {
  if (pct >= 100) return { bar: "bg-red-500", pct: "text-red-500" };
  if (pct >= 80) return { bar: "bg-amber-400", pct: "text-amber-500" };
  return { bar: "bg-emerald-500", pct: "text-emerald-600" };
}

export function BudgetAlertsWidget({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <div
      className="rounded-[20px] bg-card border border-border p-4 flex flex-col gap-[13px]"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.3px] text-muted-foreground">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="14" y="6" width="3" height="12" rx="1"/>
          </svg>
          Presupuestos
        </span>
        <Link href="/ajustes" className="text-[11px] font-semibold text-primary">
          Ver todos ›
        </Link>
      </div>

      <div className="flex flex-col gap-[14px]">
        {categories.map((cat) => {
          const { bar, pct } = statusClass(cat.percentage);
          const available = cat.monthlyBudget - cat.spent;
          return (
            <div key={cat.id} className="flex flex-col gap-[6px]">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-semibold flex items-center gap-[7px]">
                  <span
                    className="w-[26px] h-[26px] rounded-[8px] inline-flex items-center justify-center text-[13px] flex-shrink-0"
                    style={{ background: "var(--muted)" }}
                  >
                    {cat.icon ?? "📁"}
                  </span>
                  {cat.name}
                </span>
                <div className="text-right flex-shrink-0">
                  <span className="text-[14px] font-bold num">{formatCurrency(cat.spent)}</span>
                  <span className={`text-[11px] font-bold ${pct}`}> · {Math.round(cat.percentage)}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${bar}`}
                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground num">
                {available > 0
                  ? `${formatCurrency(available)} disponible de ${formatCurrency(cat.monthlyBudget)}`
                  : `Excedido en ${formatCurrency(Math.abs(available))}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
