import { notFound } from "next/navigation";
import { db } from "@/shared/lib/db";
import { expense } from "@/shared/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { getFixedExpensePayments } from "@/gastos-fijos/queries";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GastoFijoDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const [exp] = await db
    .select()
    .from(expense)
    .where(eq(expense.id, id), isNull(expense.deletedAt))
    .limit(1);

  if (!exp || exp.householdId !== household.id) notFound();

  const payments = await getFixedExpensePayments(id);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">{exp.description}</h1>
        <p className="text-muted-foreground text-sm">
          Monto estimado: ${exp.amount} · Vence día {exp.recurrenceDay}
        </p>
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Historial de pagos</h2>
        {payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin pagos registrados.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
              >
                <span>{p.periodMonth}</span>
                <span className="font-mono">${p.amount}</span>
                {p.notes && (
                  <span className="text-muted-foreground text-xs">{p.notes}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
