"use client";

import { formatCurrency } from "@/shared/components/currency-display";

type DataPoint = {
  month: string;
  label: string;
  expenses: number;
  income: number;
};

type Props = {
  data: DataPoint[];
};

export function AnnualChart({ data }: Props) {
  const max = Math.max(...data.flatMap((d) => [d.expenses, d.income]), 1);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d) => {
          const expH = Math.round((d.expenses / max) * 100);
          const incH = Math.round((d.income / max) * 100);
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end gap-0.5" style={{ height: "112px" }}>
                {/* Expenses bar */}
                <div className="flex-1 rounded-t-sm bg-violet-500/70 transition-all duration-500"
                  style={{ height: `${expH}%` }} />
                {/* Income bar */}
                {d.income > 0 && (
                  <div className="flex-1 rounded-t-sm bg-emerald-500/70 transition-all duration-500"
                    style={{ height: `${incH}%` }} />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground leading-none">{d.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-violet-500/70" />
          <span>Gastos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
          <span>Ingresos</span>
        </div>
      </div>

      {/* Last 3 months summary */}
      <div className="space-y-1.5 border-t border-border pt-3">
        {data.slice(-3).reverse().map((d) => (
          <div key={d.month} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {new Date(`${d.month}T12:00:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </span>
            <div className="flex gap-3 text-xs">
              <span className="text-violet-600 dark:text-violet-400 font-medium">
                -{formatCurrency(d.expenses)}
              </span>
              {d.income > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  +{formatCurrency(d.income)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
