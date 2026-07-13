"use server";

import { z } from "zod";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { monthToDate, formatMonthLabel } from "@/resumen/month-utils";
import {
  getMonthlySummary,
  getFixedVsVariableBreakdown,
  getInstallmentBurden,
} from "@/resumen/queries";
import { getAnnualSummary } from "@/resumen/annual-queries";
import { getMonthlyIncomeTotal } from "@/ingresos/queries";
import { generateFinancialInsights } from "./gemini";
import type { FinancialInsights, InsightsInput } from "./types";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function analyzeFinances(
  month: string
): Promise<{ insights?: FinancialInsights; error?: string }> {
  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedMonth.success) return { error: "Mes inválido" };

  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No hay hogar" };

  const monthDb = monthToDate(parsedMonth.data);

  const [summary, breakdown, burden, annual, ingresoMensual] = await Promise.all([
    getMonthlySummary(household.id, monthDb),
    getFixedVsVariableBreakdown(household.id, monthDb),
    getInstallmentBurden(household.id, monthDb),
    getAnnualSummary(household.id, currentPeriodMonth()),
    getMonthlyIncomeTotal(household.id, monthDb),
  ]);

  // Sin datos para analizar → no gastamos una llamada a la IA.
  if (summary.grandTotal === 0 && ingresoMensual === 0) {
    return { error: "No hay datos suficientes en este mes para analizar." };
  }

  const mesMasCaro =
    annual.length > 0
      ? annual.reduce((m, d) => (d.expenses > m.expenses ? d : m))
      : null;
  const promedioMensualAnual =
    annual.length > 0
      ? Math.round(annual.reduce((sum, d) => sum + d.expenses, 0) / annual.length)
      : 0;

  const payload: InsightsInput = {
    mes: formatMonthLabel(parsedMonth.data),
    ingresoMensual,
    totalGastado: summary.grandTotal,
    gastoFijo: breakdown.fixedAmount,
    gastoVariable: breakdown.variableAmount,
    gastoCuotas: breakdown.installmentsAmount,
    categorias: summary.byCategory.map((c) => ({
      nombre: c.categoryName,
      gastado: c.total,
      presupuesto: c.budget,
    })),
    cuotasActivas: burden.installments.map((i) => ({
      descripcion: i.description,
      montoMensual: i.amount,
      mesesRestantes: i.remaining,
    })),
    promedioMensualAnual,
    mesMasCaro: mesMasCaro
      ? { mes: formatMonthLabel(mesMasCaro.month.slice(0, 7)), monto: mesMasCaro.expenses }
      : null,
  };

  const insights = await generateFinancialInsights(payload);
  if (!insights) {
    return { error: "No se pudo generar el análisis. Intentá de nuevo en un momento." };
  }
  return { insights };
}
