import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { getMonthlyIncome, getMonthlyIncomeTotal } from "@/ingresos/queries";
import { formatCurrency } from "@/shared/components/currency-display";
import { AddIncomeForm } from "@/ingresos/components/add-income-form";
import { IncomeList } from "@/ingresos/components/income-list";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Ingresos" };

export default async function IngresosPage() {
  let rows: Awaited<ReturnType<typeof getMonthlyIncome>> = [];
  let total = 0;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const month = currentPeriodMonth();
      [rows, total] = await Promise.all([
        getMonthlyIncome(household.id, month),
        getMonthlyIncomeTotal(household.id, month),
      ]);
    }
  } catch {
    // no session
  }

  const monthLabel = new Date().toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Ingresos</h1>
      </div>

      {/* Total banner */}
      {total > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="opacity-75" />
            <p className="text-sm font-medium opacity-75">Total del mes</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(total)}</p>
        </div>
      )}

      {/* Add form */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Agregar ingreso</h2>
        <AddIncomeForm />
      </div>

      {/* List */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-5">
          <h2 className="text-sm font-semibold text-foreground pt-4 pb-2">Este mes</h2>
          <IncomeList rows={rows} />
          <div className="pb-2" />
        </div>
      )}
    </div>
  );
}
