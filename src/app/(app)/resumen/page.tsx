import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { currentMonth, monthToDate, formatMonthLabel } from "@/resumen/month-utils";
import {
  getMonthlySummary,
  getFixedVsVariableBreakdown,
  getInstallmentBurden,
} from "@/resumen/queries";
import { getAnnualSummary } from "@/resumen/annual-queries";
import { MonthPickerNav } from "@/resumen/components/month-picker-nav";
import { CategoryChart } from "@/resumen/components/category-chart";
import { FixedVariableBreakdown } from "@/resumen/components/fixed-variable-breakdown";
import { AnnualChart } from "@/resumen/components/annual-chart";
import { formatCurrency } from "@/shared/components/currency-display";
import type { MonthlySummary, FixedVsVariableBreakdown as FVB, InstallmentBurden } from "@/resumen/types";
import type { MonthlyDataPoint } from "@/resumen/annual-queries";

type Props = { searchParams: Promise<{ month?: string }> };

export const metadata: Metadata = { title: "Resumen" };

const MOCK_SUMMARY: MonthlySummary = {
  fixedTotal: 808990,
  installmentsTotal: 134990,
  oneTimeTotal: 294500,
  grandTotal: 1238480,
  byCategory: [
    { categoryId: "1", categoryName: "Vivienda", total: 735000 },
    { categoryId: "2", categoryName: "Alimentación", total: 187500 },
    { categoryId: "3", categoryName: "Transporte", total: 113000 },
    { categoryId: "4", categoryName: "Salud", total: 42000 },
    { categoryId: "5", categoryName: "Tecnología", total: 160980 },
  ],
};

const MOCK_BREAKDOWN: FVB = {
  fixedAmount: 808990,
  fixedPct: 65,
  variableAmount: 294500,
  variablePct: 24,
  installmentsAmount: 134990,
  installmentsPct: 11,
};

const MOCK_BURDEN: InstallmentBurden = {
  monthlyLockIn: 134990,
  installments: [
    { id: "1", description: "Notebook Samsung", amount: 89990, remaining: 9 },
    { id: "2", description: 'Smart TV 55"', amount: 45000, remaining: 4 },
  ],
};

export default async function ResumenPage({ searchParams }: Props) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentMonth();
  const monthDb = monthToDate(month);

  let summary = MOCK_SUMMARY;
  let breakdown = MOCK_BREAKDOWN;
  let burden = MOCK_BURDEN;
  let annualData: MonthlyDataPoint[] = [];

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      [summary, breakdown, burden, annualData] = await Promise.all([
        getMonthlySummary(household.id, monthDb),
        getFixedVsVariableBreakdown(household.id, monthDb),
        getInstallmentBurden(household.id, monthDb),
        getAnnualSummary(household.id),
      ]);
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted-foreground capitalize">{formatMonthLabel(month)}</p>
      </div>

      <MonthPickerNav month={month} />

      {summary.grandTotal === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sin gastos registrados para este mes</p>
        </div>
      ) : (
        <>
          {/* Totales rápidos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total del mes</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(summary.grandTotal)}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Cuotas bloqueadas</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(burden.monthlyLockIn)}</p>
            </div>
          </div>

          {/* Por categoría */}
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Por categoría</h2>
            <CategoryChart categories={summary.byCategory} />
          </div>

          {/* Fijos vs Variables */}
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Distribución</h2>
            <FixedVariableBreakdown breakdown={breakdown} />
          </div>

          {/* Vista anual */}
          {annualData.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <h2 className="text-sm font-semibold">Últimos 12 meses</h2>
              <AnnualChart data={annualData} />
            </div>
          )}

          {/* Cuotas activas */}
          {burden.installments.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Cuotas activas</h2>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(burden.monthlyLockIn)}/mes
                </span>
              </div>
              <ul className="space-y-2.5">
                {burden.installments.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate flex-1 mr-2">{item.description}</span>
                    <span className="text-muted-foreground shrink-0">
                      {item.remaining} cuota{item.remaining !== 1 ? "s" : ""} restante{item.remaining !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
