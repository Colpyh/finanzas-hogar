import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/household/queries";
import { parseMonthParam } from "@/shared/lib/db/helpers";
import { getMonthlyIncome, getMonthlyIncomeTotal } from "@/ingresos/queries";
import { formatCurrency } from "@/shared/components/currency-display";
import { AddIncomeForm } from "@/ingresos/components/add-income-form";
import { IncomeList } from "@/ingresos/components/income-list";
import { MonthSelector } from "@/shared/components/month-selector";

export const metadata: Metadata = { title: "Ingresos" };

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function IngresosPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = parseMonthParam(params.month);

  let rows: Awaited<ReturnType<typeof getMonthlyIncome>> = [];
  let total = 0;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      [rows, total] = await Promise.all([
        getMonthlyIncome(household.id, month),
        getMonthlyIncomeTotal(household.id, month),
      ]);
    }
  } catch {
    // no session
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-[23px] font-semibold text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          Ingresos
        </h1>
        <MonthSelector month={month} />
      </div>

      {/* Hero card — green gradient */}
      <div
        className="rounded-[20px] p-5 text-white"
        style={{
          background: "radial-gradient(120% 100% at 0% 0%, #34d27e 0%, transparent 55%), linear-gradient(140deg,#22c55e,#15803d)",
          boxShadow: "0 1px 2px rgba(21,128,61,.4), 0 16px 36px -10px rgba(21,128,61,.5)",
        }}
      >
        <p className="text-[12.5px] font-medium" style={{ color: "rgba(255,255,255,.85)" }}>
          Total del mes
        </p>
        <p
          className="text-[34px] font-semibold text-white mt-[3px] num"
          style={{ letterSpacing: "-0.02em" }}
        >
          {total > 0 ? formatCurrency(total) : "—"}
        </p>
      </div>

      {/* Add form */}
      <div>
        <h2
          className="text-[14px] font-extrabold text-foreground mb-3"
          style={{ letterSpacing: "-0.02em" }}
        >
          {rows.some((r) => r.type === "salary") ? "Actualizar o agregar ingreso" : "Agregar ingreso"}
        </h2>
        <div
          className="bg-card border border-border rounded-[18px] p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <AddIncomeForm month={month} />
        </div>
      </div>

      {/* Income list */}
      {rows.length > 0 && (
        <div>
          <h2
            className="text-[14px] font-extrabold text-foreground mb-3"
            style={{ letterSpacing: "-0.02em" }}
          >
            Este mes
          </h2>
          <IncomeList rows={rows} />
        </div>
      )}
    </div>
  );
}
