"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { toggleFixedExpenseActive } from "@/gastos-fijos/actions";
import { formatCurrency } from "@/shared/components/currency-display";
import { CheckCircle2, Clock } from "lucide-react";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    recurrenceDay: number | null;
    isActive: boolean | null;
    categoryName?: string;
    isShared: boolean;
  };
  isPaidThisMonth: boolean;
  currentUserConfirmed: boolean;
  confirmedCount: number;
  memberCount: number;
};

export function FixedExpenseCard({
  expense,
  isPaidThisMonth,
  currentUserConfirmed,
  confirmedCount,
  memberCount,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Determine icon and button for shared vs solo
  let icon: React.ReactNode;
  let buttonDisabled: boolean;
  let buttonText: string;
  let buttonVariantProp: "ghost" | "outline" = "outline";

  if (!expense.isShared) {
    icon = isPaidThisMonth ? (
      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
    ) : (
      <Clock size={18} className="text-amber-500 shrink-0" />
    );
    buttonDisabled = isPaidThisMonth;
    buttonText = isPaidThisMonth ? "Pagado este mes" : "Marcar como pagado";
    buttonVariantProp = isPaidThisMonth ? "ghost" : "outline";
  } else {
    if (isPaidThisMonth) {
      icon = <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />;
      buttonDisabled = true;
      buttonText = "Todos confirmaron ✓";
      buttonVariantProp = "ghost";
    } else if (currentUserConfirmed) {
      icon = <Clock size={18} className="text-amber-500 shrink-0" />;
      buttonDisabled = true;
      buttonText = `Tu parte confirmada · esperando ${memberCount - confirmedCount}`;
      buttonVariantProp = "ghost";
    } else {
      icon = <Clock size={18} className="text-amber-500 shrink-0" />;
      buttonDisabled = false;
      buttonText = "Confirmar mi parte";
      buttonVariantProp = "outline";
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
          <Button
            size="sm"
            variant={buttonVariantProp}
            disabled={buttonDisabled}
            onClick={() => setDialogOpen(true)}
            className="flex-1"
          >
            {buttonText}
          </Button>
          <form action={toggleFixedExpenseActive.bind(null, expense.id)}>
            <Button size="sm" variant="ghost" type="submit" className="text-muted-foreground">
              {expense.isActive ? "Desactivar" : "Activar"}
            </Button>
          </form>
        </div>
      </div>

      <MarkPaidDialog
        expenseId={expense.id}
        estimatedAmount={expense.amount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
