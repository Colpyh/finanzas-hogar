"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { markInstallmentPaid, markAsMonthlyPayer, registerInstallmentShare } from "@/compras/actions";
import { markPaidForOther, unmarkOtherPayment } from "@/gastos-fijos/actions";
import { canMarkInstallmentPaid } from "@/compras/installment-utils";
import { formatCurrency } from "@/shared/components/currency-display";
import { EditInstallmentDialog } from "./edit-installment-dialog";
import { Users } from "lucide-react";
import Link from "next/link";

type Props = {
  expense: {
    id: string;
    description: string;
    installmentAmount: string | null;
    installmentsPaid: number | null;
    installmentsTotal: number | null;
    categoryName?: string;
    responsibleName?: string | null;
    cardName?: string | null;
    cardColor?: string | null;
    cardLastFour?: string | null;
    isShared?: boolean;
    currentUserStatus?: "none" | "reserved" | "paid";
    isPaidThisMonth?: boolean;
    isSettled?: boolean;
    paidByName?: string | null;
    myShareAmount?: string;
  };
};

type OptimisticState = {
  paidDelta?: number;
  status?: "paid";
  settled?: boolean;
} | null;

export function InstallmentCard({ expense }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmShareOpen, setConfirmShareOpen] = useState(false);
  const [confirmMarkBothOpen, setConfirmMarkBothOpen] = useState(false);
  const [confirmUnmarkOpen, setConfirmUnmarkOpen] = useState(false);
  const [loading, startLoading] = useTransition();
  const [sharingLoading, startShare] = useTransition();
  const [markingBoth, startMarkBoth] = useTransition();
  const [unmarking, startUnmark] = useTransition();
  // Optimista: los diálogos cierran al tap y la card refleja el nuevo estado
  // sin esperar el roundtrip; si la action falla, revierte con el error.
  const [optimistic, setOptimistic] = useState<OptimisticState>(null);

  // Cuando el servidor re-sincroniza las props, el override optimista sobra
  // (dejarlo aplicado duplicaría el efecto, ej. contador +2).
  useEffect(() => {
    setOptimistic(null);
  }, [expense.installmentsPaid, expense.currentUserStatus, expense.isSettled, expense.isPaidThisMonth]);

  const paid = (expense.installmentsPaid ?? 0) + (optimistic?.paidDelta ?? 0);
  const total = expense.installmentsTotal ?? 0;
  const canPay = canMarkInstallmentPaid(paid, total);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;

  const isShared = expense.isShared ?? false;
  const isPaidThisMonth = optimistic?.status === "paid" || (expense.isPaidThisMonth ?? false);
  const isSettled = optimistic?.settled ?? (expense.isSettled ?? false);
  const currentUserStatus = optimistic?.status ?? (expense.currentUserStatus ?? "none");

  function handlePay() {
    setConfirmOpen(false);
    setError(null);
    setOptimistic(isShared ? { status: "paid" } : { paidDelta: 1 });
    startLoading(async () => {
      // Para compartidas: solo registra en balance sin tocar el contador
      const result = isShared
        ? await markAsMonthlyPayer(expense.id)
        : await markInstallmentPaid(expense.id);
      if (result?.error) {
        setOptimistic(null);
        setError(result.error);
      }
    });
  }

  function handleShare() {
    setConfirmShareOpen(false);
    setError(null);
    setOptimistic({ status: "paid" });
    startShare(async () => {
      const result = await registerInstallmentShare(expense.id);
      if (result?.error) {
        setOptimistic(null);
        setError(result.error);
      }
    });
  }

  function handleMarkBoth() {
    setConfirmMarkBothOpen(false);
    setError(null);
    setOptimistic({ settled: true, status: "paid" });
    startMarkBoth(async () => {
      const result = await markPaidForOther(expense.id);
      if (result?.error) {
        setOptimistic(null);
        setError(result.error);
      }
    });
  }

  function handleUnmark() {
    setConfirmUnmarkOpen(false);
    setError(null);
    startUnmark(async () => {
      const result = await unmarkOtherPayment(expense.id);
      if (result?.error) setError(result.error);
    });
  }

  // ── Botón de acción ──────────────────────────────────
  let actionButton: React.ReactNode;

  if (!canPay) {
    actionButton = (
      <Button size="sm" variant="ghost" disabled className="text-muted-foreground ml-auto">
        Completado
      </Button>
    );
  } else if (!isShared) {
    actionButton = (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        className="ml-auto"
      >
        Marcar cuota pagada
      </Button>
    );
  } else if (isSettled) {
    actionButton = (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirmUnmarkOpen(true)}
        className="ml-auto text-emerald-600 hover:text-amber-600 hover:bg-amber-50"
      >
        Saldado ✓ · Editar
      </Button>
    );
  } else if (isPaidThisMonth && currentUserStatus === "paid") {
    actionButton = (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirmMarkBothOpen(true)}
        className="ml-auto gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        <Users size={13} />
        Marcar saldado por ambos
      </Button>
    );
  } else if (isPaidThisMonth && currentUserStatus === "none") {
    actionButton = (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirmShareOpen(true)}
        className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        Pagado por {expense.paidByName ?? "otro"} · Saldar mi parte
      </Button>
    );
  } else {
    // Nadie registró pago este mes aún
    actionButton = (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        className="ml-auto"
      >
        {isShared ? "Registrar que pagué este mes" : "Marcar cuota pagada"}
      </Button>
    );
  }

  const paidAmount = expense.installmentAmount ? parseFloat(expense.installmentAmount) * paid : 0;
  const leftAmount = expense.installmentAmount ? parseFloat(expense.installmentAmount) * (total - paid) : 0;

  return (
    <div className="bg-card border border-border rounded-[18px] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <Link href={`/gastos/${expense.id}`} className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-foreground truncate">{expense.description}</p>
          <div className="flex items-center gap-[7px] mt-[4px] flex-wrap">
            {expense.cardName && (
              <span
                className="text-[10.5px] font-bold px-[7px] py-[2px] rounded-[6px]"
                style={{
                  color: expense.cardColor ?? "#7c3aed",
                  background: `${expense.cardColor ?? "#7c3aed"}22`,
                }}
              >
                {expense.cardName}{expense.cardLastFour ? ` ···${expense.cardLastFour}` : ""}
              </span>
            )}
            <span className="text-[11.5px] font-semibold text-muted-foreground">
              {paid}/{total} cuotas
            </span>
            {isShared && (
              <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-primary/10 text-primary">
                Compartido
              </span>
            )}
          </div>
        </Link>
        <div className="text-right shrink-0">
          {expense.installmentAmount && (
            <>
              <p className="text-[15px] font-extrabold text-foreground num">
                {formatCurrency(parseFloat(expense.installmentAmount))}
              </p>
              <p className="text-[10.5px] text-muted-foreground mt-[1px]">por mes</p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-[8px] rounded-[5px] overflow-hidden mt-[13px]"
        style={{ background: "var(--card-2, #f4f2fb)" }}
      >
        <div
          className="h-full rounded-[5px] transition-all duration-500"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg,#8b46f0,#6d28d9)" }}
        />
      </div>

      {/* Paid / Remaining */}
      <div className="flex justify-between mt-[7px]">
        <span className="text-[11px] text-muted-foreground num">Pagado {formatCurrency(paidAmount)}</span>
        <span className="text-[11px] text-muted-foreground num">Falta {formatCurrency(leftAmount)}</span>
      </div>

      {/* Action + edit row */}
      <div className="flex items-center justify-between gap-2 mt-3">
        <EditInstallmentDialog
          expense={{
            id: expense.id,
            description: expense.description,
            installmentsPaid: paid,
            installmentsTotal: total,
            isShared: expense.isShared,
          }}
        />
        {actionButton}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isShared ? "¿Registrar pago de este mes?" : "¿Marcar cuota como pagada?"}
        description={
          isShared
            ? `Esto registra que pagaste la cuota de "${expense.description}" este mes. El otro miembro verá que te debe su parte en el balance.`
            : `Cuota ${paid + 1} de ${total} de "${expense.description}".`
        }
        confirmText="Sí, registrar"
        loading={loading}
        onConfirm={handlePay}
      />

      <ConfirmDialog
        open={confirmShareOpen}
        onOpenChange={setConfirmShareOpen}
        title="¿Registrar tu parte?"
        description={`Esto registra que saldaste tu parte de la cuota de "${expense.description}" este mes.`}
        confirmText="Sí, registrar"
        loading={sharingLoading}
        onConfirm={handleShare}
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
        description={`Esto eliminará el registro de pago de ${expense.paidByName ?? "el otro miembro"} para este mes.`}
        confirmText="Sí, deshacer"
        variant="destructive"
        loading={unmarking}
        onConfirm={handleUnmark}
      />
    </div>
  );
}
