"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { upgradeToPaid, markPaidForOther, unmarkOtherPayment, unmarkMyPayment } from "@/gastos-fijos/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { Pencil, Users, Check, Undo2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

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
  memberCount: number;
};

function ActionBtn({
  onClick,
  variant = "default",
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "amber";
  title?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls = {
    default: "border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground bg-transparent",
    primary: "bg-primary border-primary text-white hover:opacity-90",
    success: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200",
    amber: "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-8 h-8 rounded-[8px] border flex items-center justify-center text-[13px] font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
        cls
      )}
    >
      {children}
    </button>
  );
}

type OptimisticState = {
  status?: "reserved" | "paid";
  settled?: boolean;
} | null;

export function FixedExpenseCard({
  expense,
  isPaidThisMonth: serverPaidThisMonth,
  isSettled: serverSettled,
  currentUserStatus: serverStatus,
  paidByName,
  myShareAmount,
  periodMonth,
  memberCount,
}: Props) {
  // Los atajos "marcar/deshacer el pago del OTRO" asumen un único otro miembro.
  // Con 3+ se ocultan: cada uno marca su parte, y el saldar entre personas vive
  // en Balances (por-deudor). Con 2 miembros el flujo queda igual que siempre.
  const twoMembers = memberCount <= 2;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmUpgradeOpen, setConfirmUpgradeOpen] = useState(false);
  const [confirmMarkBothOpen, setConfirmMarkBothOpen] = useState(false);
  const [confirmUnmarkOpen, setConfirmUnmarkOpen] = useState(false);
  const [confirmUnmarkMineOpen, setConfirmUnmarkMineOpen] = useState(false);
  const [upgrading, startUpgrade] = useTransition();
  const [markingBoth, startMarkBoth] = useTransition();
  const [unmarking, startUnmark] = useTransition();
  const [unmarkingMine, startUnmarkMine] = useTransition();
  // Optimista: la card refleja el pago al tap; revierte con toast si falla.
  const [optimistic, setOptimistic] = useState<OptimisticState>(null);

  // Reset al re-sincronizar props del servidor (evita doble aplicación).
  useEffect(() => {
    setOptimistic(null);
  }, [serverPaidThisMonth, serverSettled, serverStatus]);

  const currentUserStatus = optimistic?.status ?? serverStatus;
  const isPaidThisMonth = optimistic?.status != null || serverPaidThisMonth;
  const isSettled = optimistic?.settled ?? serverSettled;

  function handleUpgrade() {
    setConfirmUpgradeOpen(false);
    setOptimistic({ status: "paid" });
    startUpgrade(async () => {
      try {
        const result = await upgradeToPaid(expense.id, periodMonth);
        if (result?.error) {
          setOptimistic(null);
          toast.error(result.error);
        } else {
          toast.success("Pago confirmado");
        }
      } catch {
        setOptimistic(null);
        toast.error("Error al confirmar el pago. Intentá de nuevo.");
      }
    });
  }

  function handleMarkBoth() {
    setConfirmMarkBothOpen(false);
    setOptimistic({ status: "paid", settled: true });
    startMarkBoth(async () => {
      try {
        const result = await markPaidForOther(expense.id, periodMonth);
        if (result?.error) {
          setOptimistic(null);
          toast.error(result.error);
        } else {
          toast.success("Saldado por ambos");
        }
      } catch {
        setOptimistic(null);
        toast.error("Error al registrar el pago. Intentá de nuevo.");
      }
    });
  }

  function handleUnmarkMine() {
    startUnmarkMine(async () => {
      try {
        const result = await unmarkMyPayment(expense.id, periodMonth);
        if (result?.error) {
          toast.error(result.error);
        }
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

  const isVariable = expense.type === "variable";
  const isFullyPaid = isSettled || (!expense.isShared && isPaidThisMonth);

  const stripeColor = isFullyPaid
    ? "var(--success-line)"
    : currentUserStatus === "reserved"
      ? "var(--amber-line)"
      : "var(--pending-line)";

  // ── Status tag ────────────────────────────────────────
  let statusTag: React.ReactNode;
  if (isFullyPaid) {
    statusTag = (
      <span className="inline-flex items-center gap-[3px] text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-emerald-100 text-emerald-700">
        ✓ Pagado
      </span>
    );
  } else if (isPaidThisMonth) {
    statusTag = (
      <span className="inline-flex items-center gap-[3px] text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-amber-100 text-amber-700">
        ⚖️ Pago parcial
      </span>
    );
  } else if (currentUserStatus === "reserved") {
    statusTag = (
      <span className="inline-flex items-center gap-[3px] text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-amber-100 text-amber-700">
        🐷 En chanchito
      </span>
    );
  } else if (isVariable) {
    statusTag = (
      <span className="inline-flex items-center gap-[3px] text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-primary/10 text-primary">
        Varía cada mes
      </span>
    );
  } else {
    statusTag = (
      <span className="inline-flex items-center gap-[3px] text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-muted text-muted-foreground">
        Sin pagar
      </span>
    );
  }

  // ── Compact action buttons ────────────────────────────
  let actionButtons: React.ReactNode;

  if (isVariable && currentUserStatus === "none" && !isPaidThisMonth) {
    actionButtons = (
      <ActionBtn onClick={() => setDialogOpen(true)} variant="primary" title="Ingresar monto y pagar">
        <Check size={13} />
      </ActionBtn>
    );
  } else if (!expense.isShared) {
    if (currentUserStatus === "paid") {
      actionButtons = (
        <ActionBtn onClick={() => setConfirmUnmarkMineOpen(true)} variant="success" title="Pagado — click para deshacer">
          <Undo2 size={13} />
        </ActionBtn>
      );
    } else if (currentUserStatus === "reserved") {
      actionButtons = (
        <ActionBtn onClick={() => setConfirmUpgradeOpen(true)} variant="amber" title="Confirmar pago definitivo" disabled={upgrading}>
          <Check size={13} />
        </ActionBtn>
      );
    } else {
      actionButtons = (
        <ActionBtn onClick={() => setDialogOpen(true)} variant="primary" title="Marcar como pagado"><Check size={13} /></ActionBtn>
      );
    }
  } else {
    if (isSettled) {
      // Editar el pago del otro solo tiene sentido con 2 miembros; a 3+ es un
      // check estático (deshacer un pago ajeno específico se maneja aparte).
      actionButtons = twoMembers ? (
        <ActionBtn onClick={() => setConfirmUnmarkOpen(true)} variant="success" title="Saldado — click para editar" disabled={unmarking}>
          <Undo2 size={13} />
        </ActionBtn>
      ) : (
        <ActionBtn onClick={() => {}} variant="success" title="Pagado por todos" disabled>
          <Check size={13} />
        </ActionBtn>
      );
    } else if (isPaidThisMonth && currentUserStatus === "paid") {
      actionButtons = (
        <>
          <ActionBtn onClick={() => setConfirmUnmarkMineOpen(true)} variant="amber" title="Deshacer mi pago" disabled={unmarkingMine}><Undo2 size={13} /></ActionBtn>
          {twoMembers && (
            <ActionBtn onClick={() => setConfirmMarkBothOpen(true)} variant="amber" title="Marcar saldado por ambos" disabled={markingBoth}>
              <Users size={13} />
            </ActionBtn>
          )}
        </>
      );
    } else if (isPaidThisMonth && currentUserStatus === "none") {
      actionButtons = (
        <ActionBtn onClick={() => setDialogOpen(true)} variant="amber" title={`Pagado por ${paidByName ?? "otro"} — saldar mi parte`}>
          <Check size={13} />
        </ActionBtn>
      );
    } else if (currentUserStatus === "reserved") {
      actionButtons = (
        <ActionBtn onClick={() => setConfirmUpgradeOpen(true)} variant="amber" title="Confirmar pago definitivo" disabled={upgrading}>
          <Check size={13} />
        </ActionBtn>
      );
    } else {
      actionButtons = (
        <ActionBtn onClick={() => setDialogOpen(true)} variant="primary" title="Registrar pago"><Check size={13} /></ActionBtn>
      );
    }
  }

  return (
    <>
      <div
        className={cn(
          "relative flex items-start gap-3 px-4 py-[14px] border-b border-border last:border-b-0 transition-opacity",
          isFullyPaid && "opacity-60"
        )}
      >
        {/* Left stripe */}
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-[2px]" style={{ background: stripeColor }} />

        {/* Body */}
        <div className="flex-1 min-w-0 pl-[6px]">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="font-semibold text-[14px] text-foreground truncate">{expense.description}</span>
            <span className={cn(
              "text-[14px] font-bold num shrink-0",
              !isFullyPaid && !isPaidThisMonth ? "text-muted-foreground" : "text-foreground"
            )}>
              {isVariable && currentUserStatus === "none" && !isPaidThisMonth
                ? "—"
                : formatCurrency(parseFloat(expense.amount))}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-[5px] flex-wrap">
            {statusTag}
            {expense.recurrenceDay && (
              <span className="text-[11px] text-muted-foreground">día {expense.recurrenceDay}</span>
            )}
            {expense.isShared && (
              <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-primary/10 text-primary">
                Compartido
              </span>
            )}
            {expense.responsibleName && (
              <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-primary/10 text-primary/80">
                Paga: {expense.responsibleName}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {actionButtons}
          <Link
            href={`/gastos-fijos/${expense.id}`}
            title="Editar"
            className="w-8 h-8 rounded-[8px] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
          >
            <Pencil size={13} />
          </Link>
        </div>
      </div>

      <MarkPaidDialog
        expenseId={expense.id}
        estimatedAmount={myShareAmount ?? expense.amount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        periodMonth={periodMonth}
        onOptimistic={(status) => setOptimistic({ status })}
        onError={() => setOptimistic(null)}
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
