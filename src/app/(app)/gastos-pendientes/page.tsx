import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { listPendingByHousehold } from "@/email-inbound/queries";
import { PendingExpenseList } from "@/email-inbound/components/pending-expense-list";
import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, eq, isNull } from "drizzle-orm";
import type { PendingExpense } from "@/shared/lib/db/schema";

export const metadata: Metadata = { title: "Gastos Pendientes" };

const MOCK_ITEMS: PendingExpense[] = [];
const MOCK_CATEGORIES: { id: string; name: string }[] = [];

export default async function GastosPendientesPage() {
  let items: PendingExpense[] = MOCK_ITEMS;
  let categories: { id: string; name: string }[] = MOCK_CATEGORIES;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      [items, categories] = await Promise.all([
        listPendingByHousehold(household.id),
        db
          .select({ id: category.id, name: category.name })
          .from(category)
          .where(
            or(
              isNull(category.householdId),
              eq(category.householdId, household.id)
            )
          ),
      ]);
    }
  } catch {
    // Falls back to empty mock state
  }

  return (
    <div className="px-4 pb-8 pt-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Gastos Pendientes</h1>
      <PendingExpenseList items={items} categories={categories} />
    </div>
  );
}
