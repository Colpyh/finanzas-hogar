"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { toggleFixedExpenseActive, upgradeToPaid, markPaidForOther, unmarkOtherPayment, unmarkMyPayment } from "@/gastos-fijos/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { CheckCircle2, Clock, PiggyBank, Pencil, Users, HelpCircle } from "lucide-react";
import Link from "next/link";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    type?: string;
    recurrenceDay: number | null;
    isActive: boolean | null;
    categoryName?: string;
    isShared: boolean;
    responsibleName?: string | null;
  };
  isPaidThisMonth: boolean;
  isSettled: boolean;
  currentUserStatus: "none" | "reserved" | "paid";
  paidByName?: string | null;
  myShareAmount?: string;
  periodMonth: string;
};

export function FixedExpenseCard({
  expense,
  isPaidThisMonth,
  isSettled,
  currentUserStatus,
  paidByName,
  myShareAmount,
  periodMonth,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [confirmUpgradeOpen, setConfirmUpgradeOpen] = useState(false);
  const [toggling, startToggle] = useTransition();
  const [upgrading, startUpgrade] = useTransition();
  const [confirmMarkBothOpen, setConfirmMarkBothOpen] = useState(false);
  const [confirmUnmarkOpen, setConfirmUnmarkOpen] = useState(false);
  const [confirmUnmarkMineOpen, setConfirmUnmarkMineOpen] = useState(false);
  const [markingBoth, startMarkBoth] = useTransition();
  const [unmarking, startUnmark] = useTransition();
  const [unmarkingMine, startUnmarkMine] = useTransition();

  function handleUpgrade() {
    startUpgrade(async () => {
      try {
        const result = await upgradeToPaid(expense.id, periodMonth);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Pago confirmado");
        }
      } catch {
        toast.error("Error al confirmar el pago. Intentá de nuevo.");
      }
      setConfirmUpgradeOpen(false);
    });
  }

  function handleMarkBoth() {
    startMarkBoth(async () => {
      try {
        const result = await markPaidForOther(expense.id, periodMonth);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Saldado por ambos");
        }
      } catch {
        toast.error("Error al registrar el pago. Intentá de nuevo.");
      }
      setConfirmMarkBothOpen(false);
    });
  }

  function handleUnmarkMine() {
    startUnmarkMine(async () => {
      try {
        await unmarkMyPayment(expense.id, periodMonth);
      } catch {
        toast.error("Error al deshacer el pago. Intentá de nuevo.");
      }
      setConfirmUnmarkMineOpen(false);
    });
  }

  function handleUnmark() {
    startUnmark(async () => {
      try {
        const result = await unmarkOtherPayment(expense.id, periodMonth);
        if (result?.error) {
          toast.error(result.error);
        }
      } catch {
        toast.error("Error al deshacer el pago. Intentá de nuevo.");
      }
      setConfirmUnmarkOpen(false);
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleFixedExpenseActive(expense.id);
      setConfirmToggleOpen(false);
    });
  }

  // ── Icon ──────────────────────────────────────────────
  const isVariable = expense.type === "variable";
  let icon: React.ReactNode;
  if (isSettled || (!expense.isShared && isPaidThisMonth)) {
    icon = <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />;
  } else if (isPaidThisMonth) {
    // Pagado pero no saldado internamente
    icon = <CheckCircle2 size={18} className="text-amber-500 shrink-0" />;
  } else if (currentUserStatus === "reserved") {
    icon = <PiggyBank size={18} className="text-violet-500 shrink-0" />;
  } else if (isVariable && currentUserStatus === "none") {
    icon = <HelpCircle size={18} className="text-amber-400 shrink-0" />;
  } else {
    icon = <Clock size={18} className="text-amber-500 shrink-0" />;
  }

  // ── Button logic ──────────────────────────────────────
  let primaryButton: React.ReactNode;

  // Variable expenses with no payment yet — prompt user to enter the actual amount
  if (isVariable && currentUserStatus === "none" && !isPaidThisMonth) {
    primaryButton = (
      <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
        Ingresar monto y pagar
      </Button>
    );
  } else if (!expense.isShared) {
    if (currentUserStatus === "paid") {
      primaryButton = (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmUnmarkMineOpen(true)}
          className="flex-1 text-emerald-600 hover:text-amber-600 hover:bg-amber-50"
        >
          Pagado ✓ · Deshacer
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
    if (isSettled) {
      primaryButton = (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmUnmarkOpen(true)}
          className="flex-1 text-emerald-600 hover:text-amber-600 hover:bg-amber-50"
        >
          Saldado ✓ · Editar
        </Button>
      );
    } else if (isPaidThisMonth && currentUserStatus === "paid") {
      primaryButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmMarkBothOpen(true)}
          className="flex-1 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Users size={13} />
          Marcar saldado por ambos
        </Button>
      );
    } else if (isPaidThisMonth && currentUserStatus === "none") {
      // El otro pagó, yo debo saldar mi parte
      primaryButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          Pagado por {paidByName ?? "otro"} · Saldar mi parte
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
      // Nadie ha pagado aún
      primaryButton = (
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="flex-1">
          Registrar pago
        </Button>
      );
    }
  }

  const stripeColor =
    isSettled || isPaidThisMonth
      ? "var(--success-line)"
      : currentUserStatus === "reserved"
        ? "var(--amber-line)"
        : "var(--pending-line)";

  return (
    <>
      <div
        className="bg-card border border-border rounded-[20px] p-4 space-y-3 relative overflow-hidden"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px]" style={{ background: stripeColor }} />
        <div className="flex items-start justify-between gap-2 pl-3">
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
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="text-[16px] font-extrabold num text-foreground">
              {isVariable
                ? <span className="text-amber-500 text-sm font-semibold">Variable</span>
                : formatCurrency(parseFloat(expense.amount))}
            </p>
            {expense.recurrenceDay && (
              <p className="text-xs text-muted-foreground">día {expense.recurrenceDay}</p>
            )}
            <Link
              href={`/gastos-fijos/${expense.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Editar gasto fijo"
            >
              <Pencil size={13} />
            </Link>
          </div>
        </div>

        <div className="flex gap-2 pl-3">
          {primaryButton}
          {expense.isShared && currentUserStatus === "paid" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-600 hover:bg-amber-50"
              disabled={unmarkingMine}
              onClick={() => setConfirmUnmarkMineOpen(true)}
            >
              Deshacer
            </Button>
          )}
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
        estimatedAmount={myShareAmount ?? expense.amount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        periodMonth={periodMonth}
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
        description={`Esto marcará "${expense.description}" como pagado y reemplazará el estado de chanchito.`}
        confirmText="Sí, confirmar pago"
        loading={upgrading}
        onConfirm={handleUpgrade}
      />

      <ConfirmDialog
        open={confirmMarkBothOpen}
        onOpenChange={setConfirmMarkBothOpen}
        title="¿Marcar saldado por ambos?"
        description={`Esto registrará el pago de "${expense.description}" por la otra persona. Podrás deshacerlo si fue un error.`}
        confirmText="Sí, marcar por ambos"
        loading={markingBoth}
        onConfirm={handleMarkBoth}
      />

      <ConfirmDialog
        open={confirmUnmarkOpen}
        onOpenChange={setConfirmUnmarkOpen}
        title="¿Editar registro de pago?"
        description={`Esto eliminará el registro de pago de ${paidByName ?? "el otro miembro"} para "${expense.description}" este mes.`}
        confirmText="Sí, deshacer"
        variant="destructive"
        loading={unmarking}
        onConfirm={handleUnmark}
      />

      <ConfirmDialog
        open={confirmUnmarkMineOpen}
        onOpenChange={setConfirmUnmarkMineOpen}
        title="¿Deshacer tu pago?"
        description={`Esto eliminará tu registro de pago para "${expense.description}" y volverá a quedar pendiente.`}
        confirmText="Sí, deshacer"
        variant="destructive"
        loading={unmarkingMine}
        onConfirm={handleUnmarkMine}
      />
    </>
  );
}
