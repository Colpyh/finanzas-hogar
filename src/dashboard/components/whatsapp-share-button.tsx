"use client";

import { Button } from "@/components/ui/button";
import type { DashboardSummary, FixedBillWithStatus, ActiveInstallment, RecentPurchase } from "@/dashboard/types";
import type { MemberBalance } from "@/balances/queries";

function fmt(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function buildText(
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
  const monthLabel = new Date(Number(year), Number(m) - 1).toLocaleString("es-CL", { month: "long", year: "numeric" });

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
      const date = new Date(p.expenseDate + "T00:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" });
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

type Props = {
  month: string;
  householdName: string;
  summary: DashboardSummary;
  bills: FixedBillWithStatus[];
  installments: ActiveInstallment[];
  purchases: RecentPurchase[];
  balances: MemberBalance[];
  memberNames: Record<string, string>;
};

export function WhatsappShareButton({ month, householdName, summary, bills, installments, purchases, balances, memberNames }: Props) {
  function handleShare() {
    const text = buildText(month, householdName, summary, bills, installments, purchases, balances, memberNames);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleShare} title="Compartir por WhatsApp">
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </Button>
  );
}
