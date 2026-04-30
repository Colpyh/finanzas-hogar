import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getExpenses, countExpenses, getSharedInstallmentPaymentsForPeriod } from "@/compras/queries";
import { getHouseholdMembers } from "@/household/queries";
import { getHouseholdCards } from "@/tarjetas/queries";
import { PurchaseList } from "@/compras/components/purchase-list";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam } from "@/shared/lib/db/helpers";
import { buttonVariants } from "@/components/ui/button";
import { Plus, CreditCard, Download, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ type?: string; from?: string; to?: string; month?: string; card?: string; q?: string; page?: string }>;
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
  isShared?: boolean;
  currentUserStatus?: "none" | "reserved" | "paid";
  isPaidThisMonth?: boolean;
  isSettled?: boolean;
  paidByName?: string | null;
  myShareAmount?: string;
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

function buildSearchParams(base: Record<string, string | undefined | null>, overrides: Record<string, string | undefined | null>): string {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v != null && v !== "") params.set(k, v);
  }
  return params.toString();
}

export default async function ComprasPage({ searchParams }: Props) {
  const params = await searchParams;
  const typeFilter = (params.type as "one_time" | "installment" | "all") ?? "all";
  const cardFilter = params.card ?? null;
  const month = parseMonthParam(params.month);
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Derive date range from month unless explicit from/to are set
  const mParts = month.split("-").map(Number);
  const mYear = mParts[0] ?? new Date().getFullYear();
  const mMonth = mParts[1] ?? new Date().getMonth() + 1;
  const lastDay = new Date(mYear, mMonth, 0).toISOString().slice(0, 10);
  const dateFrom = params.from ?? month;
  const dateTo = params.to ?? lastDay;

  let expenses: ExpenseRow[] = MOCK_EXPENSES;
  let cards: { id: string; name: string; color: string }[] = [];
  let totalCount = 0;
  let isAuthenticated = false;

  // Base params for preserving filters in links/forms
  const baseParams: Record<string, string | undefined | null> = {
    type: typeFilter !== "all" ? typeFilter : undefined,
    month,
    card: cardFilter,
    from: params.from,
    to: params.to,
  };

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      isAuthenticated = true;
      const sharedFilters = {
        type: typeFilter,
        dateFrom,
        dateTo,
        cardId: cardFilter,
        search: q || undefined,
      };

      const [dbExpenses, total, members, dbCards, sharedPayments] = await Promise.all([
        getExpenses(household.id, { ...sharedFilters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        countExpenses(household.id, sharedFilters),
        getHouseholdMembers(household.id),
        getHouseholdCards(household.id),
        getSharedInstallmentPaymentsForPeriod(household.id, month),
      ]);

      totalCount = total;
      cards = dbCards.map((c) => ({ id: c.id, name: c.name, color: c.color }));
      const memberCount = members.length || 1;
      const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? ""]));

      // Agrupar pagos del mes por expenseId
      const paymentsByExpense = new Map<string, typeof sharedPayments[number]["payment"][]>();
      for (const { payment } of sharedPayments) {
        const list = paymentsByExpense.get(payment.expenseId) ?? [];
        list.push(payment);
        paymentsByExpense.set(payment.expenseId, list);
      }

      expenses = dbExpenses.map((e) => {
        const isShared = e.isShared ?? false;
        let sharedFields: Partial<ExpenseRow> = {};

        if (isShared && e.type === "installment") {
          const payments = paymentsByExpense.get(e.id) ?? [];
          const paidPayments = payments.filter((p) => p.status === "paid");
          const isPaidThisMonth = paidPayments.length >= 1;
          const isSettled = paidPayments.length >= memberCount;
          const myPayment = payments.find((p) => p.paidBy === user.id);
          const currentUserStatus = myPayment ? (myPayment.status as "reserved" | "paid") : "none";
          const otherPaid = paidPayments.find((p) => p.paidBy !== user.id);
          const paidByName = otherPaid ? (memberMap.get(otherPaid.paidBy) ?? null) : null;
          const myShareAmount = (parseFloat(e.installmentAmount ?? "0") / memberCount).toFixed(2);
          sharedFields = { isPaidThisMonth, isSettled, currentUserStatus, paidByName, myShareAmount };
        }

        return {
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
          isShared,
          ...sharedFields,
        };
      });
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  const filtered = typeFilter === "all"
    ? expenses
    : expenses.filter((e) => e.type === typeFilter);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const FILTERS = [
    { label: "Todos", value: "all" },
    { label: "Compras", value: "one_time" },
    { label: "Cuotas", value: "installment" },
  ];

  // Export URL: all current filters, no page/limit
  const exportParams = buildSearchParams(
    { type: typeFilter !== "all" ? typeFilter : undefined, month, card: cardFilter, from: params.from, to: params.to },
    { q: q || undefined }
  );

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

      {/* Search + Export bar */}
      <div className="flex gap-2 items-center">
        <form method="GET" className="flex-1 flex gap-2 items-center">
          {/* Preserve existing filters */}
          {typeFilter !== "all" && <input type="hidden" name="type" value={typeFilter} />}
          <input type="hidden" name="month" value={month} />
          {cardFilter && <input type="hidden" name="card" value={cardFilter} />}
          {params.from && <input type="hidden" name="from" value={params.from} />}
          {params.to && <input type="hidden" name="to" value={params.to} />}

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar gasto..."
              className="w-full h-8 rounded-xl border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
          >
            Buscar
          </button>
          {q && (
            <Link
              href={`/compras?${buildSearchParams(baseParams, { q: undefined })}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 gap-1")}
            >
              <X size={13} />
              Limpiar
            </Link>
          )}
        </form>

        {isAuthenticated && (
          <a
            href={`/api/compras/export${exportParams ? `?${exportParams}` : ""}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1")}
          >
            <Download size={13} />
            Exportar CSV
          </a>
        )}
      </div>

      <div className="flex gap-3 items-start">
        <nav className="flex flex-col gap-1 shrink-0 w-[72px]">
          {FILTERS.map((opt) => {
            const isActive = typeFilter === opt.value;
            const href = `/compras?${buildSearchParams({ ...baseParams, q: q || undefined }, { type: opt.value !== "all" ? opt.value : undefined, page: undefined })}`;
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
                const href = `/compras?${buildSearchParams({ ...baseParams, q: q || undefined }, { card: isActive ? undefined : c.id, page: undefined })}`;
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

        <div className="flex-1 min-w-0 space-y-4">
          <PurchaseList expenses={filtered} />

          {/* Pagination — only show when authenticated and data is paginated */}
          {isAuthenticated && totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <Link
                href={`/compras?${buildSearchParams({ ...baseParams, q: q || undefined }, { page: page > 1 ? String(page - 1) : undefined })}`}
                aria-disabled={page <= 1}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page <= 1 && "pointer-events-none opacity-50"
                )}
              >
                Anterior
              </Link>

              <span className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </span>

              <Link
                href={`/compras?${buildSearchParams({ ...baseParams, q: q || undefined }, { page: page < totalPages ? String(page + 1) : String(page) })}`}
                aria-disabled={page >= totalPages}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page >= totalPages && "pointer-events-none opacity-50"
                )}
              >
                Siguiente
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
