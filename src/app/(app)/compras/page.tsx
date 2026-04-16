import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getExpenses } from "@/compras/queries";
import { getHouseholdMembers } from "@/household/queries";
import { getHouseholdCards } from "@/tarjetas/queries";
import { PurchaseList } from "@/compras/components/purchase-list";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam } from "@/shared/lib/db/helpers";
import { buttonVariants } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ type?: string; from?: string; to?: string; month?: string; card?: string }>;
};

export const metadata: Metadata = { title: "Compras" };

type ExpenseRow = {
  id: string;
  type: string;
  description: string;
  amount: string | null;
  expenseDate: string | null;
  installmentAmount: string | null;
  installmentsPaid: number | null;
  installmentsTotal: number | null;
  categoryName?: string;
  responsibleName?: string | null;
  cardName?: string | null;
  cardColor?: string | null;
  cardLastFour?: string | null;
};

const MOCK_EXPENSES: ExpenseRow[] = [
  {
    id: "1", type: "one_time", description: "Supermercado Lider",
    amount: "187500", expenseDate: "2026-04-05",
    installmentAmount: null, installmentsPaid: null, installmentsTotal: null,
  },
  {
    id: "2", type: "one_time", description: "Farmacia Cruz Verde",
    amount: "42000", expenseDate: "2026-04-04",
    installmentAmount: null, installmentsPaid: null, installmentsTotal: null,
  },
  {
    id: "3", type: "one_time", description: "Bencina Shell",
    amount: "65000", expenseDate: "2026-04-03",
    installmentAmount: null, installmentsPaid: null, installmentsTotal: null,
  },
  {
    id: "4", type: "installment", description: "Notebook Samsung",
    amount: null, expenseDate: null,
    installmentAmount: "89990", installmentsPaid: 3, installmentsTotal: 12,
  },
  {
    id: "5", type: "installment", description: 'Smart TV 55"',
    amount: null, expenseDate: null,
    installmentAmount: "45000", installmentsPaid: 8, installmentsTotal: 12,
  },
];

export default async function ComprasPage({ searchParams }: Props) {
  const params = await searchParams;
  const typeFilter = (params.type as "one_time" | "installment" | "all") ?? "all";
  const cardFilter = params.card ?? null;
  const month = parseMonthParam(params.month);

  // Derive date range from month unless explicit from/to are set
  const mParts = month.split("-").map(Number);
  const mYear = mParts[0] ?? new Date().getFullYear();
  const mMonth = mParts[1] ?? new Date().getMonth() + 1;
  const lastDay = new Date(mYear, mMonth, 0).toISOString().slice(0, 10);
  const dateFrom = params.from ?? month;
  const dateTo = params.to ?? lastDay;

  let expenses: ExpenseRow[] = MOCK_EXPENSES;
  let cards: { id: string; name: string; color: string }[] = [];

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const [dbExpenses, members, dbCards] = await Promise.all([
        getExpenses(household.id, { type: typeFilter, dateFrom, dateTo, cardId: cardFilter }),
        getHouseholdMembers(household.id),
        getHouseholdCards(household.id),
      ]);
      cards = dbCards.map((c) => ({ id: c.id, name: c.name, color: c.color }));
      const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? ""]));
      expenses = dbExpenses.map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        amount: e.amount ?? null,
        expenseDate: e.expenseDate ?? null,
        installmentAmount: e.installmentAmount ?? null,
        installmentsPaid: e.installmentsPaid ?? null,
        installmentsTotal: e.installmentsTotal ?? null,
        categoryName: undefined,
        responsibleName: e.responsibleId ? (memberMap.get(e.responsibleId) ?? null) : null,
        cardName: e.cardName ?? null,
        cardColor: e.cardColor ?? null,
        cardLastFour: e.cardLastFour ?? null,
      }));
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  const filtered = typeFilter === "all"
    ? expenses
    : expenses.filter((e) => e.type === typeFilter);

  const FILTERS = [
    { label: "Todos", value: "all" },
    { label: "Compras", value: "one_time" },
    { label: "Cuotas", value: "installment" },
  ];

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
        <div className="flex items-center gap-2">
          <MonthSelector month={month} />
          <Link href="/compras/nuevo" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Plus size={15} />
            Nueva
          </Link>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <nav className="flex flex-col gap-1 shrink-0 w-[72px]">
          {FILTERS.map((opt) => {
            const isActive = typeFilter === opt.value && !cardFilter;
            const href = cardFilter
              ? `/compras?type=${opt.value}&month=${month}&card=${cardFilter}`
              : `/compras?type=${opt.value}&month=${month}`;
            return (
              <Link
                key={opt.value}
                href={href}
                className={cn(
                  "relative flex items-center justify-center py-2.5 px-2 text-xs font-medium rounded-xl transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary" />
                )}
                {opt.label}
              </Link>
            );
          })}

          {/* Card filters */}
          {cards.length > 0 && (
            <>
              <div className="my-1 border-t border-border" />
              {cards.map((c) => {
                const isActive = cardFilter === c.id;
                const href = isActive
                  ? `/compras?type=${typeFilter}&month=${month}`
                  : `/compras?type=${typeFilter}&month=${month}&card=${c.id}`;
                return (
                  <Link
                    key={c.id}
                    href={href}
                    title={c.name}
                    className={cn(
                      "relative flex items-center justify-center py-2.5 px-2 rounded-xl transition-colors",
                      isActive ? "bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary" />
                    )}
                    <CreditCard
                      size={15}
                      style={{ color: isActive ? c.color : undefined }}
                      className={isActive ? "" : "text-muted-foreground"}
                    />
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="flex-1 min-w-0">
          <PurchaseList expenses={filtered} />
        </div>
      </div>
    </div>
  );
}
