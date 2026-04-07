import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getExpenseById } from "@/compras/queries";
import { deleteExpense } from "@/compras/actions";
import { Button } from "@/components/ui/button";
import { InstallmentProgress } from "@/compras/components/installment-progress";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Detalle de Gasto" };

export default async function GastoDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const exp = await getExpenseById(id, household.id);
  if (!exp) notFound();

  const isCreator = exp.createdBy === user.id;
  const isInstallment = exp.type === "installment";

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{exp.description}</h1>
        <p className="text-sm text-muted-foreground capitalize">{exp.type.replace("_", " ")}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Monto</span>
          <span className="font-mono">${exp.amount}</span>
        </div>
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
      </div>

      {isCreator && (
        <form
          action={async () => {
            "use server";
            await deleteExpense(exp.id);
          }}
        >
          <Button variant="destructive" size="sm" type="submit" className="w-full">
            Eliminar gasto
          </Button>
        </form>
      )}
    </div>
  );
}
