import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { FixedExpenseForm } from "@/gastos-fijos/components/fixed-expense-form";

export default async function NuevoGastoFijoPage() {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const categories = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(
      or(isNull(category.householdId), eq(category.householdId, household.id))
    )
    .orderBy(category.name);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo gasto fijo</h1>
      <FixedExpenseForm categories={categories} />
    </div>
  );
}
