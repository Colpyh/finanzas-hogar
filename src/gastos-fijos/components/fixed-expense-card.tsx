"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "./payment-status-badge";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { toggleFixedExpenseActive } from "@/gastos-fijos/actions";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    recurrenceDay: number | null;
    isActive: boolean | null;
    categoryName?: string;
  };
  isPaidThisMonth: boolean;
};

export function FixedExpenseCard({ expense, isPaidThisMonth }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="font-medium">{expense.description}</p>
              {expense.categoryName && (
                <p className="text-xs text-muted-foreground">{expense.categoryName}</p>
              )}
            </div>
            <PaymentStatusBadge isPaid={isPaidThisMonth} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-mono">${expense.amount}</span>
            {expense.recurrenceDay && (
              <span className="text-muted-foreground">
                Vence día {expense.recurrenceDay}
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isPaidThisMonth}
              onClick={() => setDialogOpen(true)}
              className="flex-1"
            >
              {isPaidThisMonth ? "Pagado" : "Marcar pagado"}
            </Button>

            <form action={toggleFixedExpenseActive.bind(null, expense.id)}>
              <Button size="sm" variant="ghost" type="submit">
                {expense.isActive ? "Desactivar" : "Activar"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <MarkPaidDialog
        expenseId={expense.id}
        estimatedAmount={expense.amount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
