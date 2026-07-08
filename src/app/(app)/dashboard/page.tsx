import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import {
  getDashboardSummary,
  getFixedExpenseStatusThisMonth,
  getActiveInstallments,
  getRecentPurchases,
} from "@/dashboard/queries";
import { getCategoryBudgetStatus } from "@/categories/queries";
import { getCardPaymentsDue } from "@/tarjetas/queries";
import type { CardPaymentDue } from "@/tarjetas/queries";
import { getAnnualSummary } from "@/resumen/annual-queries";
import { MonthlySummaryCard } from "@/dashboard/components/monthly-summary-card";
import { FixedExpensesWidget } from "@/dashboard/components/fixed-expenses-widget";
import { InstallmentsWidget } from "@/dashboard/components/installments-widget";
import { RecentPurchasesWidget } from "@/dashboard/components/recent-purchases-widget";
import { BudgetAlertsWidget } from "@/dashboard/components/budget-alerts-widget";
import { CardPaymentsWidget } from "@/dashboard/components/card-payments-widget";
import { QuickAddFab } from "@/dashboard/components/quick-add-fab";
import { WhatsappShareButton } from "@/dashboard/components/whatsapp-share-button";
import { buildWhatsappText } from "@/dashboard/whatsapp-message";
import { ViewTabs } from "@/dashboard/components/view-tabs";
import { AnimatedWidgets } from "@/shared/components/animated-widgets";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam, currentPeriodMonth } from "@/shared/lib/db/helpers";
import { getPendingBalances } from "@/balances/queries";
import type {
  DashboardSummary,
  FixedBillWithStatus,
  ActiveInstallment,
  RecentPurchase,
  CategoryBudgetStatus,
} from "@/dashboard/types";
import type { MemberBalance } from "@/balances/queries";

export const metadata: Metadata = { title: "Inicio" };

type Props = {
  searchParams: Promise<{ month?: string; view?: string }>;
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
  myIncomeTotal: 900000,
  mySaldo: 280760,
};

const MOCK_BILLS: FixedBillWithStatus[] = [
  { id: "1", description: "Arriendo", amount: 650000, paid: true, responsibleId: null, isShared: true },
  { id: "2", description: "Internet + TV", amount: 25990, paid: true, responsibleId: null, isShared: true },
  { id: "3", description: "Gastos comunes", amount: 85000, paid: false, responsibleId: null, isShared: true },
  { id: "4", description: "Seguro auto", amount: 48000, paid: false, responsibleId: null, isShared: false },
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

const MOCK_BUDGETS: CategoryBudgetStatus[] = [
  { id: "1", name: "Supermercado", icon: "🛒", color: null, monthlyBudget: 300000, spent: 187500, percentage: 63 },
  { id: "2", name: "Transporte", icon: "🚗", color: null, monthlyBudget: 80000, spent: 65000, percentage: 81 },
];

const MOCK_CARD_PAYMENTS: CardPaymentDue[] = [
  {
    cardId: "1",
    cardName: "Visa",
    cardColor: "#6366f1",
    cardLastFour: "1234",
    paymentDueDay: 10,
    closingDay: 25,
    billingStart: "2026-03-26",
    billingEnd: "2026-04-25",
    amount: 294500,
  },
];

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const view = params.view === "personal" ? "personal" : "group";

  let summary = MOCK_SUMMARY;
  let bills = MOCK_BILLS;
  let installments = MOCK_INSTALLMENTS;
  let purchases = MOCK_PURCHASES;
  let balances: MemberBalance[] = [];
  let budgets: CategoryBudgetStatus[] = MOCK_BUDGETS;
  let cardPayments: CardPaymentDue[] = MOCK_CARD_PAYMENTS;
  let householdName = "Hogar Demo";
  let currentUserId = "";
  let memberNames: Record<string, string> = {};
  let sparkData: number[] = [];

  // Solo la ausencia de sesión u hogar cae a los datos de ejemplo. Un error
  // real de queries con usuario logueado DEBE propagar al error boundary:
  // mostrar mocks ahí sería mostrar cifras financieras falsas como reales.
  const user = await getSessionUser();
  const household = user ? await getUserHousehold(user.id) : null;

  if (user && household) {
    householdName = household.name;
    currentUserId = user.id;
    const members = await getHouseholdMembers(household.id);
    const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? "Otro"]));
    const [sumData, billsData, installData, purchaseData, balanceData, budgetData, cardPaymentData, annualData] = await Promise.all([
      getDashboardSummary(household.id, user.id, month, members.length),
      getFixedExpenseStatusThisMonth(household.id, month),
      getActiveInstallments(household.id, month),
      getRecentPurchases(household.id, month, 5),
      getPendingBalances(household.id, members.length, memberMap, user.id),
      getCategoryBudgetStatus(household.id, month),
      getCardPaymentsDue(household.id, month),
      getAnnualSummary(household.id, currentPeriodMonth()),
    ]);
    summary = sumData;
    bills = billsData;
    installments = installData;
    purchases = purchaseData;
    balances = balanceData;
    budgets = budgetData;
    cardPayments = cardPaymentData;
    sparkData = annualData.slice(-7).map((d) => d.expenses);
    memberNames = Object.fromEntries(
      members
        .filter((m) => m.userId !== user.id)
        .map((m) => [m.userId, m.displayName ?? "Otro"])
    );
  }

  // Personal mode: only show expenses where the current user is responsible
  const visibleBills = view === "personal"
    ? bills.filter((b) => b.responsibleId === currentUserId)
    : bills;
  const visibleInstallments = view === "personal"
    ? installments.filter((i) => i.responsibleId === currentUserId)
    : installments;
  const visiblePurchases = view === "personal"
    ? purchases.filter((p) => p.responsibleId === currentUserId)
    : purchases;

  // Built on the server so the share button receives a single string instead of
  // re-serializing all dashboard data into the client payload.
  const whatsappText = buildWhatsappText(month, householdName, summary, bills, installments, purchases, balances, memberNames);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
      {/* Header */}
      <div
        className="border-b border-border pb-4 mb-5"
        style={{ background: "var(--card)" }}
      >
        <div className="flex items-start justify-between mb-[13px]">
          <div>
            <p className="text-[13.5px] font-medium text-muted-foreground">Buen día 👋</p>
            <h1
              className="text-[22px] font-bold text-foreground leading-tight mt-0.5"
              style={{ letterSpacing: "-0.01em" }}
            >
              {householdName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <WhatsappShareButton text={whatsappText} />
            <MonthSelector month={month} />
          </div>
        </div>
        {/* Group / Personal tabs */}
        <Suspense>
          <ViewTabs view={view} />
        </Suspense>
      </div>

      {/* Summary card — full width */}
      <AnimatedWidgets>
        <MonthlySummaryCard summary={summary} month={month} view={view} sparkData={sparkData} />
      </AnimatedWidgets>

      {/* Main grid */}
      <div className="mt-4 space-y-4">
        <AnimatedWidgets>
          {cardPayments.length > 0 && (
            <CardPaymentsWidget payments={cardPayments} month={month} />
          )}
          {budgets.some((b) => b.percentage >= 80) && (
            <BudgetAlertsWidget categories={budgets} />
          )}
        </AnimatedWidgets>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <AnimatedWidgets>
            <FixedExpensesWidget bills={visibleBills} currentUserId={currentUserId} memberNames={memberNames} />
            <InstallmentsWidget installments={visibleInstallments} currentUserId={currentUserId} memberNames={memberNames} />
          </AnimatedWidgets>
          <AnimatedWidgets>
            <RecentPurchasesWidget purchases={visiblePurchases} currentUserId={currentUserId} memberNames={memberNames} />
          </AnimatedWidgets>
        </div>
      </div>

      <QuickAddFab />
    </div>
  );
}
