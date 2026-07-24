import type { DashboardSummary, FixedBillWithStatus, ActiveInstallment, RecentPurchase } from "@/dashboard/types";
import type { MemberBalance } from "@/balances/queries";

// Pure, server-safe builder for the WhatsApp share text. Lives outside the
// client component so the dashboard can build the message on the server and pass
// a single string to the button — instead of serializing summary + bills +
// installments + purchases + balances + memberNames into the client payload
// (data the widgets already carry).
function fmt(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function buildWhatsappText(
  month: string,
  householdName: string,
  summary: DashboardSummary,
  bills: FixedBillWithStatus[],
  installments: ActiveInstallment[],
  purchases: RecentPurchase[],
  balances: MemberBalance[],
  memberNames: Record<string, string>,
): string {
  const [year, m] = month.split("-");
  const monthLabel = new Date(Number(year), Number(m) - 1).toLocaleString("es-419", { month: "long", year: "numeric" });

  const lines: string[] = [];

  const CHECK = "✅";
  const CLOCK = "⏳";
  const CHART = "\u{1F4CA}";
  const HOUSE = "\u{1F3E0}";
  const CARD  = "\u{1F4B3}";
  const CART  = "\u{1F6D2}";
  const SCALE = "⚖️";

  lines.push(`*${householdName} — ${monthLabel}*`);
  lines.push("");

  // Resumen
  lines.push(`*${CHART} Resumen del mes*`);
  lines.push(`Total gastos: ${fmt(summary.grandTotal)}`);
  lines.push(`Mi parte: ${fmt(summary.myShareTotal)}`);
  if (summary.incomeTotal > 0) {
    lines.push(`Ingresos: ${fmt(summary.incomeTotal)}`);
    lines.push(`Saldo: ${fmt(summary.saldo)}`);
  }
  lines.push("");

  // Gastos fijos
  if (bills.length > 0) {
    lines.push(`*${HOUSE} Gastos fijos*`);
    for (const b of bills) {
      const estado = b.paid ? CHECK : CLOCK;
      lines.push(`${estado} ${b.description}: ${fmt(b.amount)}`);
    }
    lines.push("");
  }

  // Cuotas
  if (installments.length > 0) {
    lines.push(`*${CARD} Cuotas activas*`);
    for (const ins of installments) {
      const progress = `${ins.installmentsPaid}/${ins.installmentsTotal}`;
      lines.push(`• ${ins.description}: ${fmt(ins.amount)} (${progress})`);
    }
    lines.push("");
  }

  // Compras recientes
  if (purchases.length > 0) {
    lines.push(`*${CART} Compras recientes*`);
    for (const p of purchases) {
      const date = new Date(p.expenseDate + "T00:00:00").toLocaleDateString("es-419", { day: "numeric", month: "short" });
      const who = p.responsibleId && memberNames[p.responsibleId] ? ` (${memberNames[p.responsibleId]})` : "";
      lines.push(`• ${p.description}${who}: ${fmt(p.amount)} — ${date}`);
    }
    lines.push("");
  }

  // Balance pendiente
  if (balances.length > 0) {
    lines.push(`*${SCALE} Balance pendiente*`);
    for (const bal of balances) {
      if (bal.net > 0) {
        lines.push(`${bal.memberName} te debe ${fmt(bal.net)}`);
      } else {
        lines.push(`Le debes ${fmt(Math.abs(bal.net))} a ${bal.memberName}`);
      }
    }
  } else {
    lines.push(`*${SCALE} Balance*`);
    lines.push(`Todo saldado ${CHECK}`);
  }

  return lines.join("\n");
}
