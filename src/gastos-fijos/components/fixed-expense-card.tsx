"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { toggleFixedExpenseActive, upgradeToPaid } from "@/gastos-fijos/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { CheckCircle2, Clock, PiggyBank } from "lucide-react";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    recurrenceDay: number | null;
    isActive: boolean | null;
    categoryName?: string;
    isShared: boolean;
    responsibleName?: string | null;
  };
  isPaidThisMonth: boolean;
  currentUserStatus: "none" | "reserved" | "paid";
  confirmedCount: number;
  memberCount: number;
};

export function FixedExpenseCard({
  expense,
  isPaidThisMonth,
  currentUserStatus,
  confirmedCount,
  memberCount,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [confirmUpgradeOpen, setConfirmUpgradeOpen] = useState(false);
  const [toggling, startToggle] = useTransition();
  const [upgrading, startUpgrade] = useTransition();

  function handleUpgrade() {
    startUpgrade(async () => {
      await upgradeToPaid(expense.id);
      setConfirmUpgradeOpen(false);
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleFixedExpenseActive(expense.id);
      setConfirmToggleOpen(false);
    });
  }

  // ── Icon ──────────────────────────────────────────────
  let icon: React.ReactNode;
  if (currentUserStatus === "paid" && (!expense.isShared || isPaidThisMonth)) {
    icon = <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />;
  } else if (currentUserStatus === "reserved") {
    icon = <PiggyBank size={18} className="text-violet-500 shrink-0" />;
  } else {
    icon = <Clock size={18} className="text-amber-500 shrink-0" />;
  }

  // ── Button logic ──────────────────────────────────────
  let primaryButton: React.ReactNode;

  if (!expense.isShared) {
    if (currentUserStatus === "paid") {
      primaryButton = (
        <Button size="sm" variant="ghost" disabled className="flex-1">
          Pagado este mes
        </Button>
      );
    } else if (currentUserStatus === "reserved") {
      primaryButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmUpgradeOpen(true)}
          className="flex-1 gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
        >
          <PiggyBank size={13} />
          En chanchito · Confirmar pago
        </Button>
      );
    } else {
      primaryButton = (
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="flex-1">
          Marcar como pagado
        </Button>
      );
    }
  } else {
    if (isPaidThisMonth) {
      primaryButton = (
        <Button size="sm" variant="ghost" disabled className="flex-1">
          Todos confirmaron ✓
        </Button>
      );
    } else if (currentUserStatus === "paid") {
      primaryButton = (
        <Button size="sm" variant="ghost" disabled className="flex-1">
          Tu parte confirmada · esperando {memberCount - confirmedCount}
        </Button>
      );
    } else if (currentUserStatus === "reserved") {
      primaryButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmUpgradeOpen(true)}
          className="flex-1 gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
        >
          <PiggyBank size={13} />
          En chanchito · Confirmar pago
        </Button>
      );
    } else {
      primaryButton = (
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="flex-1">
          Confirmar mi parte
        </Button>
      );
    }
  }

  return (
    <>
      <div className="bg-card border border-border shadow-sm rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {icon}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-sm text-foreground truncate">
                  {expense.description}
                </p>
                {expense.isShared && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">
                    Compartido
                  </span>
                )}
                {currentUserStatus === "reserved" && (
                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 shrink-0">
                    🐷 Chanchito
                  </span>
                )}
                {expense.responsibleName && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary/80 shrink-0">
                    Paga: {expense.responsibleName}
                  </span>
                )}
              </div>
              {expense.categoryName && (
                <p className="text-xs text-muted-foreground">{expense.categoryName}</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(parseFloat(expense.amount))}
            </p>
            {expense.recurrenceDay && (
              <p className="text-xs text-muted-foreground">día {expense.recurrenceDay}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {primaryButton}
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setConfirmToggleOpen(true)}
          >
            {expense.isActive ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>

      <MarkPaidDialog
        expenseId={expense.id}
        estimatedAmount={expense.amount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ConfirmDialog
        open={confirmToggleOpen}
        onOpenChange={setConfirmToggleOpen}
        title={expense.isActive ? "¿Desactivar gasto?" : "¿Activar gasto?"}
        description={
          expense.isActive
            ? `"${expense.description}" dejará de aparecer en el resumen mensual.`
            : `"${expense.description}" volverá a incluirse en el resumen mensual.`
        }
        confirmText={expense.isActive ? "Desactivar" : "Activar"}
        variant={expense.isActive ? "destructive" : "default"}
        loading={toggling}
        onConfirm={handleToggle}
      />

      <ConfirmDialog
        open={confirmUpgradeOpen}
        onOpenChange={setConfirmUpgradeOpen}
        title="¿Confirmar pago definitivo?"
        description={`Vas a marcar "${expense.description}" como pagado. Esto reemplaza el estado de chanchito.`}
        confirmText="Sí, confirmar pago"
        loading={upgrading}
        onConfirm={handleUpgrade}
      />
    </>
  );
}
