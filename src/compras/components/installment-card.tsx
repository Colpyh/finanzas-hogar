"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstallmentProgress } from "./installment-progress";
import { markInstallmentPaid } from "@/compras/actions";
import { canMarkInstallmentPaid } from "@/compras/installment-utils";
import Link from "next/link";

type Props = {
  expense: {
    id: string;
    description: string;
    installmentAmount: string | null;
    installmentsPaid: number | null;
    installmentsTotal: number | null;
    categoryName?: string;
  };
};

export function InstallmentCard({ expense }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const paid = expense.installmentsPaid ?? 0;
  const total = expense.installmentsTotal ?? 0;
  const canPay = canMarkInstallmentPaid(paid, total);

  async function handlePay() {
    setLoading(true);
    setError(null);
    const result = await markInstallmentPaid(expense.id);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/gastos/${expense.id}`} className="hover:underline">
            <p className="font-medium">{expense.description}</p>
          </Link>
          <InstallmentProgress paid={paid} total={total} />
        </div>

        {expense.installmentAmount && (
          <p className="text-sm text-muted-foreground">
            ${expense.installmentAmount}/cuota
          </p>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={!canPay || loading}
          onClick={handlePay}
        >
          {canPay ? "Marcar cuota pagada" : "Completado"}
        </Button>
      </CardContent>
    </Card>
  );
}
