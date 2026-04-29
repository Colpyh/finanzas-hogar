"use client";

import { useState, useTransition } from "react";
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

  const paid = expense.installmentsPaid ?? 0;
  const total = expense.installmentsTotal ?? 0;
  const canPay = canMarkInstallmentPaid(paid, total);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;

  const isShared = expense.isShared ?? false;
  const isPaidThisMonth = expense.isPaidThisMonth ?? false;
  const isSettled = expense.isSettled ?? false;
  const currentUserStatus = expense.currentUserStatus ?? "none";

  async function handlePay() {
    startLoading(async () => {
      // Para compartidas: solo registra en balance sin tocar el contador
      const result = isShared
        ? await markAsMonthlyPayer(expense.id)
        : await markInstallmentPaid(expense.id);
      if (result?.error) setError(result.error);
      setConfirmOpen(false);
    });
  }

  async function handleShare() {
    startShare(async () => {
      const result = await registerInstallmentShare(expense.id);
      if (result?.error) setError(result.error);
      setConfirmShareOpen(false);
    });
  }

  function handleMarkBoth() {
    startMarkBoth(async () => {
      await markPaidForOther(expense.id);
      setConfirmMarkBothOpen(false);
    });
  }

  function handleUnmark() {
    startUnmark(async () => {
      await unmarkOtherPayment(expense.id);
      setConfirmUnmarkOpen(false);
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

  return (
    <div className="bg-card border border-border shadow-sm rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/gastos/${expense.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-sm text-foreground truncate">{expense.description}</p>
            {isShared && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">
                Compartido
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {expense.categoryName && (
              <span className="text-xs text-muted-foreground">{expense.categoryName}</span>
            )}
            {expense.responsibleName && (
              <>
                {expense.categoryName && <span className="text-xs text-muted-foreground/50">·</span>}
                <span className="text-xs font-medium text-primary/80">Paga: {expense.responsibleName}</span>
              </>
            )}
            {expense.cardName && (
              <>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: expense.cardColor ?? undefined }}
                >
                  {expense.cardName}{expense.cardLastFour ? ` ···· ${expense.cardLastFour}` : ""}
                </span>
              </>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {paid}/{total} cuotas
          </span>
          <EditInstallmentDialog
            expense={{
              id: expense.id,
              description: expense.description,
              installmentsPaid: paid,
              installmentsTotal: total,
              isShared: expense.isShared,
            }}
          />
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">
          {progress}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        {expense.installmentAmount && (
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(parseFloat(expense.installmentAmount))}/cuota
            {isShared && expense.myShareAmount && (
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                (tu parte {formatCurrency(parseFloat(expense.myShareAmount))})
              </span>
            )}
          </span>
        )}
        {actionButton}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

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
