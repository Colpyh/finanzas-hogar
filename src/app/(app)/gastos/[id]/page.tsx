import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getHouseholdMembers, getUserHousehold } from "@/household/queries";
import { getExpenseById } from "@/compras/queries";
import { getHouseholdCards } from "@/tarjetas/queries";
import { DeleteExpenseButton } from "@/compras/components/delete-expense-button";
import { EditExpenseForm } from "@/compras/components/edit-expense-form";
import { InstallmentProgress } from "@/compras/components/installment-progress";
import { ReceiptDetail } from "@/receipts/components/receipt-detail";
import { formatCurrency } from "@/shared/components/currency-display";
import { ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar Gasto" };

export default async function GastoDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const [exp, cards, members] = await Promise.all([
    getExpenseById(id, household.id),
    getHouseholdCards(household.id),
    getHouseholdMembers(household.id),
  ]);
  if (!exp) notFound();
  // Gasto privado: solo lo puede ver quien lo creó, ni por URL directa.
  if (exp.isPrivate && exp.createdBy !== user.id) notFound();

  const isInstallment = exp.type === "installment";
  const isCreator = exp.createdBy === user.id;

  const cardOptions = cards.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    lastFour: c.lastFour ?? null,
  }));

  const memberOptions = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName ?? "Miembro",
  }));

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/compras" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{exp.description}</h1>
          <p className="text-xs text-muted-foreground capitalize">
            {isInstallment ? "Cuotas" : "Compra"}
          </p>
        </div>
      </div>

      {/* Installment summary (read-only) */}
      {isInstallment && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cuota mensual</span>
            <span className="font-semibold">{formatCurrency(Number(exp.installmentAmount ?? 0))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Progreso</span>
            <InstallmentProgress
              paid={exp.installmentsPaid ?? 0}
              total={exp.installmentsTotal ?? 0}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatCurrency(Number(exp.amount ?? 0))}</span>
          </div>
        </div>
      )}

      {/* Boleta fotografiada (ítems + comprobante) */}
      <ReceiptDetail
        items={exp.receiptItems ?? null}
        imagePath={exp.receiptImagePath ?? null}
      />

      {/* Edit form */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <EditExpenseForm
          expense={{
            id: exp.id,
            type: exp.type,
            description: exp.description,
            amount: exp.amount ?? null,
            expenseDate: exp.expenseDate ?? null,
            responsibleId: exp.responsibleId ?? null,
            cardId: exp.cardId ?? null,
          }}
          members={memberOptions}
          cards={cardOptions}
        />
      </div>

      {isCreator && (
        <DeleteExpenseButton expenseId={exp.id} description={exp.description} />
      )}
    </div>
  );
}
