import Link from "next/link";
import type { DashboardSummary } from "@/dashboard/types";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  summary: DashboardSummary;
};

export function MonthlySummaryCard({ summary }: Props) {
  const barWidth = Math.min(summary.porcentajeUsado, 100);
  const saldoPositive = summary.saldo >= 0;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-5 text-white shadow-lg shadow-purple-500/25">
      {/* Depth circles */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/[0.06] pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-44 h-44 rounded-full bg-white/[0.04] pointer-events-none" />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium opacity-75">Gastos del mes</p>
          <Link href="/ingresos" className="text-xs opacity-70 hover:opacity-100 underline underline-offset-2 transition-opacity">
            {summary.incomeTotal > 0 ? "Editar ingresos" : "Agregar ingresos"}
          </Link>
        </div>

        {/* Grand total */}
        <div className="flex items-end gap-3">
          <p className="text-4xl font-bold tracking-tight">
            {formatCurrency(summary.grandTotal)}
          </p>
          <p className="text-sm opacity-60 mb-1">
            Tu parte · {formatCurrency(summary.myShareTotal)}
          </p>
        </div>

        {/* Progress bar + % */}
        {summary.incomeTotal > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs opacity-60">del ingreso</span>
              <span className="text-xs font-semibold opacity-90">{summary.porcentajeUsado}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        )}

        {/* Breakdown: household + my share per category */}
        <div className="mt-4 border-t border-white/15 pt-4 space-y-2.5">
          {/* Headers */}
          <div className="grid grid-cols-4 gap-1">
            <div />
            <p className="text-[10px] opacity-50 text-center">Fijos</p>
            <p className="text-[10px] opacity-50 text-center">Cuotas</p>
            <p className="text-[10px] opacity-50 text-center">Compras</p>
          </div>
          {/* Household row */}
          <div className="grid grid-cols-4 gap-1 items-center">
            <p className="text-[10px] opacity-50">Casa</p>
            <p className="text-xs font-semibold text-center">{formatCurrency(summary.fixedTotal)}</p>
            <p className="text-xs font-semibold text-center">{formatCurrency(summary.installmentsTotal)}</p>
            <p className="text-xs font-semibold text-center">{formatCurrency(summary.oneTimeTotal)}</p>
          </div>
          {/* My share row */}
          <div className="grid grid-cols-4 gap-1 items-center">
            <p className="text-[10px] opacity-50">Yo</p>
            <p className="text-xs font-medium text-center opacity-80">{formatCurrency(summary.myShareFixed)}</p>
            <p className="text-xs font-medium text-center opacity-80">{formatCurrency(summary.myShareInstallments)}</p>
            <p className="text-xs font-medium text-center opacity-80">{formatCurrency(summary.myShareOneTime)}</p>
          </div>
        </div>

        {/* Saldo */}
        {summary.incomeTotal > 0 && (
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between">
            <p className="text-xs opacity-60">Saldo disponible</p>
            <p className={`text-sm font-bold ${saldoPositive ? "text-emerald-300" : "text-red-300"}`}>
              {saldoPositive ? "+" : ""}{formatCurrency(summary.saldo)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
