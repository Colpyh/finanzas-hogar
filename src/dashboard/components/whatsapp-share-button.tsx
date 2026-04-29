"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
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

  lines.push(`*${householdName} — ${monthLabel}*`);
  lines.push("");

  // Resumen
  lines.push("*📊 Resumen del mes*");
  lines.push(`Total gastos: ${fmt(summary.grandTotal)}`);
  lines.push(`Mi parte: ${fmt(summary.myShareTotal)}`);
  if (summary.incomeTotal > 0) {
    lines.push(`Ingresos: ${fmt(summary.incomeTotal)}`);
    lines.push(`Saldo: ${fmt(summary.saldo)}`);
  }
  lines.push("");

  // Gastos fijos
  if (bills.length > 0) {
    lines.push("*🏠 Gastos fijos*");
    for (const b of bills) {
      const estado = b.paid ? "✅" : "⏳";
      lines.push(`${estado} ${b.description}: ${fmt(b.amount)}`);
    }
    lines.push("");
  }

  // Cuotas
  if (installments.length > 0) {
    lines.push("*💳 Cuotas activas*");
    for (const ins of installments) {
      const progress = `${ins.installmentsPaid}/${ins.installmentsTotal}`;
      lines.push(`• ${ins.description}: ${fmt(ins.amount)} (${progress})`);
    }
    lines.push("");
  }

  // Compras recientes
  if (purchases.length > 0) {
    lines.push("*🛒 Compras recientes*");
    for (const p of purchases) {
      const date = new Date(p.expenseDate + "T00:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" });
      const who = p.responsibleId && memberNames[p.responsibleId] ? ` (${memberNames[p.responsibleId]})` : "";
      lines.push(`• ${p.description}${who}: ${fmt(p.amount)} — ${date}`);
    }
    lines.push("");
  }

  // Balance pendiente
  if (balances.length > 0) {
    lines.push("*⚖️ Balance pendiente*");
    for (const bal of balances) {
      if (bal.net > 0) {
        lines.push(`${bal.memberName} te debe ${fmt(bal.net)}`);
      } else {
        lines.push(`Le debes ${fmt(Math.abs(bal.net))} a ${bal.memberName}`);
      }
    }
  } else {
    lines.push("*⚖️ Balance*");
    lines.push("Todo saldado ✅");
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
      <MessageCircle className="h-5 w-5 text-green-500" />
    </Button>
  );
}
