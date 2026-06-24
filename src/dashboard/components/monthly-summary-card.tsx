import type { DashboardSummary } from "@/dashboard/types";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  summary: DashboardSummary;
  month?: string;
  view?: "group" | "personal";
  sparkData?: number[];
};

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getPeriodLabel(month?: string): string {
  if (month) {
    const [y, m] = month.split("-");
    return `${MONTHS[parseInt(m!) - 1]} ${y}`;
  }
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

// Noise texture as inline SVG data URL (pure CSS, zero deps)
const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function getSparkBars(sparkData?: number[]): number[] {
  if (!sparkData || sparkData.length === 0) return Array(7).fill(4);
  const max = Math.max(...sparkData, 1);
  return sparkData.map((v) => 4 + Math.round((v / max) * 24));
}

export function MonthlySummaryCard({ summary, month, view = "group", sparkData }: Props) {
  const isPersonal = view === "personal";
  const total = isPersonal ? summary.myShareTotal : summary.grandTotal;
  const fixedAmt = isPersonal ? summary.myShareFixed : summary.fixedTotal;
  const installAmt = isPersonal ? summary.myShareInstallments : summary.installmentsTotal;
  const variableAmt = isPersonal ? summary.myShareOneTime : summary.oneTimeTotal;
  const income = isPersonal ? summary.myIncomeTotal : summary.incomeTotal;
  const saldo = isPersonal ? summary.mySaldo : summary.saldo;
  const pct = income > 0 ? Math.round((total / income) * 100) : 0;
  const barWidth = Math.min(pct, 100);

  const period = getPeriodLabel(month);
  const formatted = formatCurrency(total);
  const [, totalNum] = formatted.split("$");

  const sparkBars = getSparkBars(sparkData);

  return (
    <div
      className="relative rounded-[26px] overflow-hidden text-white"
      style={{
        background: "linear-gradient(150deg,#8b46f0 0%,#6d28d9 55%,#5b21b6 100%)",
        boxShadow: "0 1px 2px rgba(91,33,182,.4), 0 22px 48px -12px rgba(109,40,217,.55)",
        padding: "22px 20px 20px",
      }}
    >
      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: NOISE_BG,
          opacity: 0.13,
          mixBlendMode: "soft-light",
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute -top-[50px] -right-[40px] w-[180px] h-[180px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(255,255,255,.16),transparent 70%)" }}
      />

      <div className="relative">
        {/* Top row: label + sparkline */}
        <div className="flex items-start justify-between mb-1">
          <div className="text-[12.5px] font-medium" style={{ color: "rgba(255,255,255,0.78)", letterSpacing: "0.01em" }}>
            Total gastado este mes
          </div>
          {/* Sparkline */}
          <div className="flex items-end gap-[3px] h-[30px]">
            {sparkBars.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: h,
                  borderRadius: 3,
                  background: i === sparkBars.length - 1 ? "#fff" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Big number */}
        <div
          className="num leading-none mt-0.5"
          style={{ fontSize: 48, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}
        >
          <span style={{ fontSize: 26, fontWeight: 500, opacity: 0.8, verticalAlign: "top", marginTop: 6, display: "inline-block" }}>$</span>
          {totalNum}
        </div>

        {/* Progress bar */}
        {income > 0 && (
          <>
            <div className="flex justify-between items-center mt-[18px] mb-[7px]">
              <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.82)" }}>
                {isPersonal ? "Mi parte" : `${pct}% del ingreso usado`}
              </div>
              <div className="num text-[12.5px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
                {formatCurrency(income)} Ingreso
              </div>
            </div>
            <div className="h-[9px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.22)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, background: "#fff", boxShadow: "0 0 12px rgba(255,255,255,0.6)" }}
              />
            </div>
          </>
        )}

        {/* Period pill + saldo */}
        <div className="flex items-center justify-between mt-3 mb-4">
          <span
            className="text-[11px] font-semibold px-[10px] py-[5px] rounded-full"
            style={{ background: "rgba(255,255,255,0.16)", letterSpacing: "0.01em" }}
          >
            {period}
          </span>
          {income > 0 && (
            <span className="text-[11.5px] font-semibold num" style={{ color: "rgba(255,255,255,0.88)" }}>
              Saldo: {formatCurrency(saldo)}
            </span>
          )}
        </div>

        {/* Chips */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Fijos",     value: fixedAmt },
            { label: "Cuotas",    value: installAmt },
            { label: "Variables", value: variableAmt },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[14px] px-3 py-[11px]"
              style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <div className="text-[11px] font-medium mb-[3px]" style={{ color: "rgba(255,255,255,0.78)" }}>
                {label}
              </div>
              <div className="num font-extrabold text-[14.5px] text-white">
                {formatCurrency(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
