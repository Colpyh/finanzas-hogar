import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getHouseholdMembers, getUserHousehold } from "@/household/queries";
import { getPendingBalances } from "@/balances/queries";
import { formatCurrency } from "@/shared/components/currency-display";
import { SettleButton } from "@/balances/components/settle-button";
import { ItemDetailToggle } from "@/balances/components/item-detail-toggle";
import { createClient } from "@/shared/lib/supabase/server";

export const metadata: Metadata = { title: "Balances" };

export default async function BalancesPage() {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const members = await getHouseholdMembers(household.id);
  const memberCount = members.length || 1;
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName ?? m.userId]));

  const balances = await getPendingBalances(
    household.id,
    memberCount,
    memberMap,
    user.id
  );

  // Neto por miembro (no un único total): con 3+ miembros sumar todo mezcla
  // lo que te deben con lo que debés. Cada miembro con saldo != 0 es una card.
  const memberNets = balances.filter((b) => Math.round(b.net) !== 0);

  // Flat list of all items with their balance context
  const allItems = balances.flatMap((b) =>
    b.items.map((item) => ({
      ...item,
      memberName: b.memberName,
      isOwed: b.net > 0,
    }))
  );

  // Signed URLs (batch) para las compras con boleta escaneada — bucket
  // privado, 1h de validez, mismo patrón que ReceiptDetail.
  const receiptPaths = Array.from(
    new Set(allItems.map((i) => i.receiptImagePath).filter((p): p is string => p !== null))
  );
  const receiptUrlMap = new Map<string, string>();
  if (receiptPaths.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("receipts").createSignedUrls(receiptPaths, 3600);
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) receiptUrlMap.set(row.path, row.signedUrl);
    }
  }

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
      <div>
        <h1
          className="text-[23px] font-semibold text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          Balances
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Deuda acumulada pendiente</p>
      </div>

      {balances.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
          <span className="text-[46px]">⚖️</span>
          <p className="text-[16px] font-extrabold text-foreground mt-3" style={{ letterSpacing: "-0.01em" }}>
            Todo saldado
          </p>
          <p className="text-[13px] text-muted-foreground mt-1">
            No hay deudas pendientes.
          </p>
        </div>
      ) : (
        <>
          {/* Net por miembro — una card por persona con saldo pendiente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[11px]">
            {memberNets.map((b) => {
              const positive = b.net > 0; // te debe
              return (
                <div
                  key={b.memberId}
                  className="rounded-[22px] p-[22px] text-center"
                  style={{
                    background: positive
                      ? "linear-gradient(140deg,#22c55e,#15803d)"
                      : "linear-gradient(140deg,#f59e0b,#d97706)",
                    boxShadow: positive
                      ? "0 14px 34px rgba(21,128,61,.35)"
                      : "0 14px 34px rgba(217,119,6,.35)",
                  }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,.85)" }}>
                    {positive ? `${b.memberName} te debe` : `Debes a ${b.memberName}`}
                  </p>
                  <p
                    className="text-[36px] font-semibold text-white mt-1 num"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {formatCurrency(Math.abs(b.net))}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Movements */}
          <div>
            <h2
              className="text-[14px] font-extrabold text-foreground mb-3"
              style={{ letterSpacing: "-0.02em" }}
            >
              Movimientos pendientes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[11px] items-start">
              {allItems.map((item) => {
                const payerName = item.payerId === user.id
                  ? "Tú"
                  : memberMap.get(item.payerId) ?? "Otro";
                const monthLabel = new Date(item.periodMonth + "T00:00:00").toLocaleDateString("es-419", { month: "short", year: "numeric" });
                const dirLabel = `Pagó ${payerName} · ${monthLabel}`;
                const amtColor = item.isOwed ? "#22c55e" : "#f59e0b";
                const initial = payerName.charAt(0).toUpperCase();
                return (
                  <div
                    key={`${item.expenseId}-${item.periodMonth}-${item.debtorId}`}
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
                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className="text-[14.5px] font-extrabold num"
                          style={{ color: amtColor }}
                        >
                          {formatCurrency(item.shareAmount)}
                        </span>
                        <span className="text-[11px] text-muted-foreground num mt-[1px]">
                          de {formatCurrency(item.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
                      <ItemDetailToggle
                        categoryName={item.categoryName}
                        type={item.type}
                        receiptUrl={item.receiptImagePath ? (receiptUrlMap.get(item.receiptImagePath) ?? null) : null}
                      />
                      <SettleButton
                        expenseId={item.expenseId}
                        description={item.description}
                        shareAmount={item.shareAmount}
                        periodMonth={item.periodMonth}
                        debtorId={item.debtorId}
                        debtorName={memberMap.get(item.debtorId) ?? "el deudor"}
                        iAmCreditor={item.payerId === user.id}
                      />
                    </div>
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
