import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/shared/lib/db";
import { expense } from "@/shared/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getFixedExpensePayments } from "@/gastos-fijos/queries";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdCards, getCardUsageSummary } from "@/tarjetas/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { EditFixedExpenseForm } from "@/gastos-fijos/components/edit-fixed-expense-form";
import { formatCurrency } from "@/shared/components/currency-display";
import { ChevronLeft } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Editar Gasto Fijo" };

export default async function GastoFijoDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const [exp] = await db
    .select()
    .from(expense)
    .where(and(eq(expense.id, id), eq(expense.householdId, household.id), isNull(expense.deletedAt)))
    .limit(1);

  if (!exp) notFound();

  const [payments, rawCards, usageMap] = await Promise.all([
    getFixedExpensePayments(id, household.id),
    getHouseholdCards(household.id),
    getCardUsageSummary(household.id, currentPeriodMonth()),
  ]);

  const cards = rawCards.map((c) => ({
    id: c.id,
    name: c.name,
    lastFour: c.lastFour,
    color: c.color,
    creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
    used: usageMap.get(c.id) ?? 0,
  }));

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/gastos-fijos" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar gasto fijo</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <EditFixedExpenseForm
          expense={{
            id: exp.id,
            description: exp.description,
            amount: exp.amount ?? "0",
            type: exp.type,
            recurrenceDay: exp.recurrenceDay ?? null,
            cardId: exp.cardId ?? null,
          }}
          cards={cards}
        />
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Historial de pagos</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <span className="text-muted-foreground">{p.periodMonth?.slice(0, 7)}</span>
                <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                {p.notes && (
                  <span className="text-muted-foreground text-xs truncate max-w-[100px]">{p.notes}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
