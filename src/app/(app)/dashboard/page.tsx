import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
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
import { AnimatedWidgets } from "@/shared/components/animated-widgets";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam } from "@/shared/lib/db/helpers";
import type {
  DashboardSummary,
  FixedBillWithStatus,
  ActiveInstallment,
  RecentPurchase,
} from "@/dashboard/types";

export const metadata: Metadata = { title: "Inicio" };

type Props = {
  searchParams: Promise<{ month?: string }>;
};

// Mock data — visible solo cuando no hay sesión activa (preview local)
const MOCK_SUMMARY: DashboardSummary = {
  fixedTotal: 808990,
  installmentsTotal: 134990,
  oneTimeTotal: 294500,
  grandTotal: 1238480,
  incomeTotal: 1800000,
  saldo: 561520,
  porcentajeUsado: 68.8,
  myShareTotal: 619240,
  myShareFixed: 404495,
  myShareInstallments: 67495,
  myShareOneTime: 147250,
};

const MOCK_BILLS: FixedBillWithStatus[] = [
  { id: "1", description: "Arriendo", amount: 650000, paid: true, responsibleId: null },
  { id: "2", description: "Internet + TV", amount: 25990, paid: true, responsibleId: null },
  { id: "3", description: "Gastos comunes", amount: 85000, paid: false, responsibleId: null },
  { id: "4", description: "Seguro auto", amount: 48000, paid: false, responsibleId: null },
];

const MOCK_INSTALLMENTS: ActiveInstallment[] = [
  { id: "1", description: "Notebook Samsung", amount: 89990, installmentsPaid: 3, installmentsTotal: 12, responsibleId: null },
  { id: "2", description: "Smart TV 55\"", amount: 45000, installmentsPaid: 8, installmentsTotal: 12, responsibleId: null },
];

const MOCK_PURCHASES: RecentPurchase[] = [
  { id: "1", description: "Supermercado Lider", amount: 187500, expenseDate: "2026-04-05", responsibleId: null },
  { id: "2", description: "Farmacia Cruz Verde", amount: 42000, expenseDate: "2026-04-04", responsibleId: null },
  { id: "3", description: "Bencina Shell", amount: 65000, expenseDate: "2026-04-03", responsibleId: null },
];

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = parseMonthParam(params.month);

  let summary = MOCK_SUMMARY;
  let bills = MOCK_BILLS;
  let installments = MOCK_INSTALLMENTS;
  let purchases = MOCK_PURCHASES;
  let householdName = "Hogar Demo";
  let currentUserId = "";
  let memberNames: Record<string, string> = {};

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      householdName = household.name;
      currentUserId = user.id;
      const [sumData, billsData, installData, purchaseData, members] = await Promise.all([
        getDashboardSummary(household.id, user.id, month),
        getFixedExpenseStatusThisMonth(household.id, month),
        getActiveInstallments(household.id, month),
        getRecentPurchases(household.id, month, 5),
        getHouseholdMembers(household.id),
      ]);
      summary = sumData;
      bills = billsData;
      installments = installData;
      purchases = purchaseData;
      memberNames = Object.fromEntries(
        members
          .filter((m) => m.userId !== user.id)
          .map((m) => [m.userId, m.displayName ?? "Otro"])
      );
    }
  } catch {
    // Sin sesión — se muestran datos de ejemplo
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{householdName}</h1>
        <MonthSelector month={month} />
      </div>

      <AnimatedWidgets>
        <MonthlySummaryCard summary={summary} />
        <FixedExpensesWidget bills={bills} currentUserId={currentUserId} memberNames={memberNames} />
        <InstallmentsWidget installments={installments} currentUserId={currentUserId} memberNames={memberNames} />
        <RecentPurchasesWidget purchases={purchases} currentUserId={currentUserId} memberNames={memberNames} />
      </AnimatedWidgets>

      <QuickAddFab />
    </div>
  );
}
