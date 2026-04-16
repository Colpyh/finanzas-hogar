import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getExpenseById } from "@/compras/queries";
import { getHouseholdCards } from "@/tarjetas/queries";
import { DeleteExpenseButton } from "@/compras/components/delete-expense-button";
import { InstallmentProgress } from "@/compras/components/installment-progress";
import { ExpenseCardSelector } from "@/compras/components/expense-card-selector";
import { formatCurrency } from "@/shared/components/currency-display";
import { ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Detalle de Gasto" };

export default async function GastoDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const [exp, cards] = await Promise.all([
    getExpenseById(id, household.id),
    getHouseholdCards(household.id),
  ]);
  if (!exp) notFound();

  const isCreator = exp.createdBy === user.id;
  const isInstallment = exp.type === "installment";

  const cardOptions = cards.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    lastFour: c.lastFour ?? null,
  }));

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/compras" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{exp.description}</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tipo</span>
          <span className="capitalize">{exp.type === "one_time" ? "Compra" : "Cuotas"}</span>
        </div>
        {exp.amount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-semibold">{formatCurrency(Number(exp.amount))}</span>
          </div>
        )}
        {exp.expenseDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span>{exp.expenseDate}</span>
          </div>
        )}
        {isInstallment && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Progreso</span>
            <InstallmentProgress
              paid={exp.installmentsPaid ?? 0}
              total={exp.installmentsTotal ?? 0}
            />
          </div>
        )}
        {isInstallment && exp.installmentAmount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cuota mensual</span>
            <span className="font-semibold">{formatCurrency(Number(exp.installmentAmount))}</span>
          </div>
        )}
        <div className="pt-1 border-t border-border">
          <ExpenseCardSelector
            expenseId={exp.id}
            currentCardId={exp.cardId ?? null}
            cards={cardOptions}
          />
        </div>
      </div>

      {isCreator && (
        <DeleteExpenseButton expenseId={exp.id} description={exp.description} />
      )}
    </div>
  );
}
