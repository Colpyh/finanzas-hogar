import type { DashboardSummary } from "@/dashboard/types";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  summary: DashboardSummary;
  month?: string; // "YYYY-MM-DD"
};

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getPeriodLabel(month?: string): string {
  if (month) {
    const [y, m] = month.split("-");
    const idx = parseInt(m!) - 1;
    return `${MONTHS[idx]} ${y}`;
  }
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

export function MonthlySummaryCard({ summary, month }: Props) {
  const barWidth = Math.min(summary.porcentajeUsado, 100);
  const period = getPeriodLabel(month);
  const [, totalNum] = formatCurrency(summary.grandTotal).split("$");

  return (
    <div
      className="relative rounded-[22px] overflow-hidden text-white"
      style={{
        background: "linear-gradient(150deg, #8b46f0 0%, #6d28d9 55%, #5b21b6 100%)",
        boxShadow: "var(--shadow-violet)",
        padding: "22px 20px 20px",
      }}
    >
      <div className="absolute -top-[60px] -right-[50px] w-[180px] h-[180px] rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="absolute -bottom-[50px] left-[30px] w-[130px] h-[130px] rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.06)" }} />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.4px] px-[10px] py-[5px] rounded-full"
            style={{ background: "rgba(255,255,255,0.16)" }}
          >
            {period}
          </span>
          {summary.incomeTotal > 0 && (
            <span
              className="text-[11px] font-semibold px-[10px] py-[5px] rounded-full"
              style={{ background: "rgba(255,255,255,0.16)" }}
            >
              {summary.porcentajeUsado}% del ingreso
            </span>
          )}
        </div>

        <p className="text-[12px] font-medium mt-4 mb-0.5" style={{ opacity: 0.82 }}>
          Gasto total del mes
        </p>

        <div className="leading-none tracking-tight num" style={{ fontSize: 44, fontWeight: 800 }}>
          <span className="font-semibold align-top mt-0.5 mr-0.5" style={{ fontSize: 24, opacity: 0.75 }}>
            $
          </span>
          {totalNum}
        </div>

        {summary.incomeTotal > 0 && (
          <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: 12.5, opacity: 0.78 }}>
            <span>Ingreso total:</span>
            <span className="font-semibold num">{formatCurrency(summary.incomeTotal)}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-[18px]">
          {[
            { label: "Fijos", value: summary.fixedTotal },
            { label: "Cuotas", value: summary.installmentsTotal },
            { label: "Variables", value: summary.oneTimeTotal },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[13px] px-[10px] py-[11px]"
              style={{
                background: "rgba(255,255,255,0.13)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div className="font-medium mb-1" style={{ fontSize: 10.5, opacity: 0.78 }}>
                {label}
              </div>
              <div className="font-bold num" style={{ fontSize: 16 }}>
                {formatCurrency(value)}
              </div>
            </div>
          ))}
        </div>

        {summary.incomeTotal > 0 && (
          <div className="mt-4">
            <div className="h-[6px] w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.22)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  background: "#fff",
                  boxShadow: "0 0 12px rgba(255,255,255,0.5)",
                }}
              />
            </div>
            <div className="flex justify-between font-medium mt-[7px]" style={{ fontSize: 11, opacity: 0.85 }}>
              <span>{summary.porcentajeUsado}% usado</span>
              <span>
                Saldo:{" "}
                <span className="num">{formatCurrency(summary.saldo)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
