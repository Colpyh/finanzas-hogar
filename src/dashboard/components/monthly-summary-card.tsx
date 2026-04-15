import type { DashboardSummary } from "@/dashboard/types";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  summary: DashboardSummary;
};

function getCurrentMonth() {
  return new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function MonthlySummaryCard({ summary }: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-5 text-white shadow-lg shadow-purple-500/25">
      {/* Depth circles */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/[0.06] pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-44 h-44 rounded-full bg-white/[0.04] pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium opacity-75">Total del mes</p>
          <span className="text-xs opacity-50 capitalize">{getCurrentMonth()}</span>
        </div>
        <p className="text-4xl font-bold tracking-tight">
          {formatCurrency(summary.grandTotal)}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
          <div>
            <p className="text-xs opacity-60 mb-0.5">Fijos</p>
            <p className="text-sm font-semibold">{formatCurrency(summary.fixedTotal)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60 mb-0.5">Cuotas</p>
            <p className="text-sm font-semibold">{formatCurrency(summary.installmentsTotal)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60 mb-0.5">Compras</p>
            <p className="text-sm font-semibold">{formatCurrency(summary.oneTimeTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
