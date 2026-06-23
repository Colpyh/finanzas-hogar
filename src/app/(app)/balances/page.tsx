import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import { getPendingBalances } from "@/balances/queries";
import { MonthSelector } from "@/shared/components/month-selector";
import { parseMonthParam, currentPeriodMonth } from "@/shared/lib/db/helpers";
import { formatCurrency } from "@/shared/components/currency-display";
import { SettleButton } from "@/balances/components/settle-button";

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
  const totalNet = balances.reduce((sum, b) => sum + b.net, 0);
  const netIsPositive = totalNet >= 0;

  // Flat list of all items with their balance context
  const allItems = balances.flatMap((b) =>
    b.items.map((item) => ({
      ...item,
      memberName: b.memberName,
      isOwed: b.net > 0,
    }))
  );

  // Payer avatar color — deterministic from name
  function avatarGradient(name: string): string {
    const palettes = [
      "linear-gradient(135deg,#8b46f0,#6d28d9)",
      "linear-gradient(135deg,#0ea5e9,#0369a1)",
      "linear-gradient(135deg,#22c55e,#15803d)",
      "linear-gradient(135deg,#f59e0b,#d97706)",
    ];
    const idx = name.charCodeAt(0) % palettes.length;
    return palettes[idx] ?? palettes[0]!;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-[23px] font-semibold text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          Balances
        </h1>
        <MonthSelector month={month} />
      </div>

      {balances.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
          <span className="text-[46px]">⚖️</span>
          <p className="text-[16px] font-extrabold text-foreground mt-3" style={{ letterSpacing: "-0.01em" }}>
            Todo saldado
          </p>
          <p className="text-[13px] text-muted-foreground mt-1">
            {isCurrentMonth ? "No hay deudas pendientes este mes." : "No hubo deudas pendientes en este período."}
          </p>
        </div>
      ) : (
        <>
          {/* Net card */}
          <div
            className="rounded-[22px] p-[22px] text-center"
            style={{
              background: netIsPositive
                ? "linear-gradient(140deg,#22c55e,#15803d)"
                : "linear-gradient(140deg,#f59e0b,#d97706)",
              boxShadow: netIsPositive
                ? "0 14px 34px rgba(21,128,61,.35)"
                : "0 14px 34px rgba(217,119,6,.35)",
            }}
          >
            <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,.85)" }}>
              {netIsPositive
                ? `${balances[0]?.memberName} te debe`
                : `Debes a ${balances[0]?.memberName}`}
            </p>
            <p
              className="text-[36px] font-semibold text-white mt-1 num"
              style={{ letterSpacing: "-0.01em" }}
            >
              {formatCurrency(Math.abs(totalNet))}
            </p>
          </div>

          {/* Movements */}
          <div>
            <h2
              className="text-[14px] font-extrabold text-foreground mb-3"
              style={{ letterSpacing: "-0.02em" }}
            >
              Movimientos del mes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[11px] items-start">
              {allItems.map((item) => {
                const payerName = item.payerId === user.id
                  ? "Tú"
                  : memberMap.get(item.payerId) ?? "Otro";
                const dirLabel = item.isOwed ? `Pagó ${payerName}` : `Pagó ${payerName}`;
                const amtColor = item.isOwed ? "#22c55e" : "#f59e0b";
                const initial = payerName.charAt(0).toUpperCase();
                return (
                  <div
                    key={item.expenseId}
                    className="bg-card border border-border rounded-[18px] p-[14px_15px]"
                    style={{ boxShadow: "var(--shadow-sm)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white font-extrabold text-[14px] flex-shrink-0"
                        style={{ background: avatarGradient(payerName) }}
                      >
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-foreground truncate">{item.description}</p>
                        <p className="text-[12px] text-muted-foreground mt-[2px]">{dirLabel}</p>
                      </div>
                      <span
                        className="text-[14.5px] font-extrabold shrink-0 num"
                        style={{ color: amtColor }}
                      >
                        {formatCurrency(item.shareAmount)}
                      </span>
                    </div>
                    <SettleButton
                      expenseId={item.expenseId}
                      description={item.description}
                      shareAmount={item.shareAmount}
                      periodMonth={month}
                      iAmCreditor={item.payerId === user.id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
