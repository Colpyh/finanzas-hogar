import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import {
  getDashboardSummary,
  getFixedExpenseStatusThisMonth,
  getActiveInstallments,
  getRecentPurchases,
} from "@/dashboard/queries";
import { MonthlySummaryCard } from "@/dashboard/components/monthly-summary-card";
import { FixedExpensesWidget } from "@/dashboard/components/fixed-expenses-widget";
import { InstallmentsWidget } from "@/dashboard/components/installments-widget";
import { RecentPurchasesWidget } from "@/dashboard/components/recent-purchases-widget";
import { QuickAddFab } from "@/dashboard/components/quick-add-fab";
import type {
  DashboardSummary,
  FixedBillWithStatus,
  ActiveInstallment,
} from "@/dashboard/types";

export const metadata: Metadata = { title: "Inicio" };

// Mock data — visible solo cuando no hay sesión activa (preview local)
const MOCK_SUMMARY: DashboardSummary = {
  fixedTotal: 808990,
  installmentsTotal: 134990,
  oneTimeTotal: 294500,
  grandTotal: 1238480,
};

const MOCK_BILLS: FixedBillWithStatus[] = [
  { id: "1", description: "Arriendo", amount: 650000, paid: true },
  { id: "2", description: "Internet + TV", amount: 25990, paid: true },
  { id: "3", description: "Gastos comunes", amount: 85000, paid: false },
  { id: "4", description: "Seguro auto", amount: 48000, paid: false },
];

const MOCK_INSTALLMENTS: ActiveInstallment[] = [
  {
    id: "1",
    description: "Notebook Samsung",
    amount: 89990,
    installmentsPaid: 3,
    installmentsTotal: 12,
  },
  {
    id: "2",
    description: "Smart TV 55\"",
    amount: 45000,
    installmentsPaid: 8,
    installmentsTotal: 12,
  },
];

const MOCK_PURCHASES: { id: string; description: string; amount: number; expenseDate: string | null }[] = [
  { id: "1", description: "Supermercado Lider", amount: 187500, expenseDate: "2026-04-05" },
  { id: "2", description: "Farmacia Cruz Verde", amount: 42000, expenseDate: "2026-04-04" },
  { id: "3", description: "Bencina Shell", amount: 65000, expenseDate: "2026-04-03" },
];

export default async function DashboardPage() {
  let summary = MOCK_SUMMARY;
  let bills = MOCK_BILLS;
  let installments = MOCK_INSTALLMENTS;
  let purchases = MOCK_PURCHASES;
  let householdName = "Hogar Demo";

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      householdName = household.name;
      const month = currentPeriodMonth();
      [summary, bills, installments, purchases] = await Promise.all([
        getDashboardSummary(household.id, month),
        getFixedExpenseStatusThisMonth(household.id),
        getActiveInstallments(household.id, month),
        getRecentPurchases(household.id, 5),
      ]);
    }
  } catch {
    // Sin sesión — se muestran datos de ejemplo
  }

  const monthLabel = new Date().toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{householdName}</h1>
      </div>

      <MonthlySummaryCard summary={summary} />
      <FixedExpensesWidget bills={bills} />
      <InstallmentsWidget installments={installments} />
      <RecentPurchasesWidget purchases={purchases} />

      <QuickAddFab />
    </div>
  );
}
