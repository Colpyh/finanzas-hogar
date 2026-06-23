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
import { BudgetProgress } from "@/resumen/components/budget-progress";
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
    { categoryId: "1", categoryName: "Vivienda", total: 735000, budget: null },
    { categoryId: "2", categoryName: "Alimentación", total: 187500, budget: null },
    { categoryId: "3", categoryName: "Transporte", total: 113000, budget: null },
    { categoryId: "4", categoryName: "Salud", total: 42000, budget: null },
    { categoryId: "5", categoryName: "Tecnología", total: 160980, budget: null },
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

  // Derived stats from annual data
  const mostExpensiveMonth = annualData.length > 0
    ? annualData.reduce((m, d) => d.expenses > m.expenses ? d : m)
    : null;
  const avgMonthly = annualData.length > 0
    ? Math.round(annualData.reduce((sum, d) => sum + d.expenses, 0) / annualData.length)
    : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[23px] font-semibold text-foreground"
            style={{ letterSpacing: "-0.02em" }}
          >
            Resumen anual
          </h1>
          <p className="text-[13px] text-muted-foreground mt-[3px]">Últimos 12 meses</p>
        </div>
        <MonthPickerNav month={month} />
      </div>

      {/* Annual chart card */}
      {annualData.length > 0 && (
        <div
          className="bg-card border border-border rounded-[20px] p-[18px_14px_14px]"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <AnnualChart data={annualData} />
        </div>
      )}

      {/* Stat cards: mes más caro + promedio */}
      {mostExpensiveMonth && (
        <div className="flex gap-[11px]">
          <div
            className="flex-1 rounded-[18px] p-[15px]"
            style={{ background: "linear-gradient(140deg,#8b46f0,#6d28d9)", boxShadow: "0 10px 26px rgba(109,40,217,.32)" }}
          >
            <p className="text-[11.5px] font-medium" style={{ color: "rgba(255,255,255,.82)" }}>Mes más caro</p>
            <p className="text-[17px] font-extrabold text-white mt-[3px]">{mostExpensiveMonth.label}</p>
            <p className="text-[14px] font-bold num mt-[1px]" style={{ color: "rgba(255,255,255,.92)" }}>
              {formatCurrency(mostExpensiveMonth.expenses)}
            </p>
          </div>
          <div
            className="flex-1 bg-card border border-border rounded-[18px] p-[15px]"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[11.5px] font-medium text-muted-foreground">Promedio mensual</p>
            <p className="text-[17px] font-extrabold text-foreground mt-[3px] num">
              {formatCurrency(avgMonthly)}
            </p>
          </div>
        </div>
      )}

      {/* Por categoría */}
      {summary.byCategory.length > 0 && (
        <div>
          <h2
            className="text-[16px] font-extrabold text-foreground mb-3"
            style={{ letterSpacing: "-0.02em" }}
          >
            Por categoría
          </h2>
          <CategoryChart categories={summary.byCategory} />
        </div>
      )}

      {/* Presupuesto mensual */}
      {(() => {
        const withBudget = summary.byCategory.filter((c) => c.budget !== null);
        if (withBudget.length === 0) return null;
        return (
          <div
            className="bg-card border border-border rounded-[20px] p-4 space-y-4"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <h2 className="text-[14px] font-bold text-foreground">Presupuesto mensual</h2>
            <div className="space-y-4">
              {withBudget.map((c) => (
                <BudgetProgress
                  key={c.categoryId}
                  categoryName={c.categoryName}
                  spent={c.total}
                  budget={c.budget!}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Cuotas activas */}
      {burden.installments.length > 0 && (
        <div
          className="bg-card border border-border rounded-[20px] p-4"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-foreground">Cuotas activas</h2>
            <span className="text-[12px] text-muted-foreground num">{formatCurrency(burden.monthlyLockIn)}/mes</span>
          </div>
          <ul className="space-y-2.5">
            {burden.installments.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate flex-1 mr-2">{item.description}</span>
                <span className="text-muted-foreground shrink-0 text-[12px]">
                  {item.remaining} cuota{item.remaining !== 1 ? "s" : ""} restante{item.remaining !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.grandTotal === 0 && annualData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sin gastos registrados para este mes</p>
        </div>
      )}
    </div>
  );
}
