import type { DashboardSummary } from "@/dashboard/types";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  summary: DashboardSummary;
};

export function MonthlySummaryCard({ summary }: Props) {
  return (
    <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md shadow-primary/25">
      {/* Total grande */}
      <p className="text-sm font-medium opacity-80 mb-1">Total del mes</p>
      <p className="text-4xl font-bold tracking-tight">
        {formatCurrency(summary.grandTotal)}
      </p>

      {/* Breakdown en 3 columnas */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
        <div>
          <p className="text-xs opacity-70 mb-0.5">Fijos</p>
          <p className="text-sm font-semibold">{formatCurrency(summary.fixedTotal)}</p>
        </div>
        <div>
          <p className="text-xs opacity-70 mb-0.5">Cuotas</p>
          <p className="text-sm font-semibold">{formatCurrency(summary.installmentsTotal)}</p>
        </div>
        <div>
          <p className="text-xs opacity-70 mb-0.5">Compras</p>
          <p className="text-sm font-semibold">{formatCurrency(summary.oneTimeTotal)}</p>
        </div>
      </div>
    </div>
  );
}
