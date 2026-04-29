import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import { getPendingBalances } from "@/balances/queries";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam, currentPeriodMonth } from "@/shared/lib/db/helpers";
import { formatCurrency } from "@/shared/components/currency-display";
import { EmptyState } from "@/shared/components/empty-state";
import { SettleButton } from "@/balances/components/settle-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Balances" };

type Props = { searchParams: Promise<{ month?: string }> };

export default async function BalancesPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = parseMonthParam(params.month);

  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const members = await getHouseholdMembers(household.id);
  const memberCount = members.length || 1;
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? m.userId]));

  const balances = await getPendingBalances(
    household.id,
    month,
    memberCount,
    memberMap,
    user.id
  );

  const isCurrentMonth = month === currentPeriodMonth();

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Link href="/gastos-fijos" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Balances</h1>
        </div>
        <MonthSelector month={month} />
      </div>

      {balances.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={36} className="text-emerald-500" />
          <p className="font-semibold text-foreground">Todo saldado</p>
          <p className="text-sm text-muted-foreground">
            {isCurrentMonth
              ? "No hay deudas pendientes este mes."
              : "No hubo deudas pendientes en este período."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {balances.map((balance) => {
            const isOwed = balance.net > 0;
            return (
              <div key={balance.memberId} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className={cn(
                  "flex items-center justify-between px-5 py-4",
                  isOwed ? "bg-emerald-500/8" : "bg-amber-500/8"
                )}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "rounded-full p-1.5",
                      isOwed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {isOwed
                        ? <ArrowDownLeft size={16} />
                        : <ArrowUpRight size={16} />
                      }
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground leading-none mb-0.5">
                        {isOwed ? `${balance.memberName} te debe` : `Le debés a ${balance.memberName}`}
                      </p>
                      <p className={cn(
                        "text-lg font-bold leading-none",
                        isOwed ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {formatCurrency(Math.abs(balance.net))}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {balance.items.length} {balance.items.length === 1 ? "gasto" : "gastos"}
                  </span>
                </div>

                {/* Expense breakdown */}
                <div className="divide-y divide-border">
                  {balance.items.map((item) => (
                    <div key={item.expenseId} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{item.description}</p>
                          {item.type === "installment" && (
                            <span className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                              cuota
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.type === "installment" ? "Cuota" : "Total"} {formatCurrency(item.totalAmount)} · tu parte {formatCurrency(item.shareAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          "text-sm font-semibold",
                          isOwed ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {formatCurrency(item.shareAmount)}
                        </span>
                        <SettleButton
                          expenseId={item.expenseId}
                          description={item.description}
                          shareAmount={item.shareAmount}
                          periodMonth={month}
                          iAmCreditor={item.payerId === user.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
