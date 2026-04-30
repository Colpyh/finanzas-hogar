import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { listPendingByHousehold, getPendingCount } from "@/email-inbound/queries";
import { PendingExpenseList } from "@/email-inbound/components/pending-expense-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, eq, isNull } from "drizzle-orm";
import type { PendingExpense } from "@/shared/lib/db/schema";

export const metadata: Metadata = { title: "Gastos Pendientes" };

const PAGE_SIZE = 15;
const MOCK_ITEMS: PendingExpense[] = [];
const MOCK_CATEGORIES: { id: string; name: string }[] = [];

export default async function GastosPendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let items: PendingExpense[] = MOCK_ITEMS;
  let categories: { id: string; name: string }[] = MOCK_CATEGORIES;
  let count = 0;

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      [items, categories, count] = await Promise.all([
        listPendingByHousehold(household.id, {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        db
          .select({ id: category.id, name: category.name })
          .from(category)
          .where(
            or(
              isNull(category.householdId),
              eq(category.householdId, household.id)
            )
          ),
        getPendingCount(household.id),
      ]);
    }
  } catch {
    // Falls back to empty mock state
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="px-4 pb-8 pt-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Gastos Pendientes</h1>
      <PendingExpenseList items={items} categories={categories} />
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          {page === 1 ? (
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
          ) : (
            <Link href={`?page=${page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Anterior
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              Siguiente
            </Button>
          ) : (
            <Link href={`?page=${page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
