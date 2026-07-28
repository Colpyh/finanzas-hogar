import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold, getHouseholdMembers } from "@/household/queries";
import {
  listPendingByHousehold,
  getPendingCount,
  suggestCategoryByMerchant,
  normalizeMerchant,
} from "@/email-inbound/queries";
import { PendingExpenseList } from "@/email-inbound/components/pending-expense-list";
import { CartolaUpload } from "@/cartola/components/cartola-upload";
import { Button, buttonVariants } from "@/components/ui/button";
import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, eq, isNull } from "drizzle-orm";
import type { PendingExpenseRow } from "@/shared/lib/db/schema";

export const metadata: Metadata = { title: "Gastos Pendientes" };

const PAGE_SIZE = 15;
const MOCK_ITEMS: PendingExpenseRow[] = [];
const MOCK_CATEGORIES: { id: string; name: string }[] = [];

export default async function GastosPendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let items: PendingExpenseRow[] = MOCK_ITEMS;
  let categories: { id: string; name: string }[] = MOCK_CATEGORIES;
  let count = 0;
  let memberCount = 1;
  // Categoría sugerida por pendiente (id → categoryId), según historial de gastos.
  const suggestions: Record<string, string> = {};

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const [pendingItems, cats, pendingCount, members] = await Promise.all([
        listPendingByHousehold(household.id, user.id, {
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
        getPendingCount(household.id, user.id),
        getHouseholdMembers(household.id),
      ]);
      items = pendingItems;
      categories = cats;
      count = pendingCount;
      memberCount = members.length || 1;

      const merchants = items
        .map((i) => i.parsedMerchant)
        .filter((m): m is string => Boolean(m));
      if (merchants.length > 0) {
        const byMerchant = await suggestCategoryByMerchant(household.id, merchants);
        const validCategory = new Set(categories.map((c) => c.id));
        for (const item of items) {
          if (!item.parsedMerchant) continue;
          const categoryId = byMerchant[normalizeMerchant(item.parsedMerchant)];
          if (categoryId && validCategory.has(categoryId)) {
            suggestions[item.id] = categoryId;
          }
        }
      }
    }
  } catch {
    // Falls back to empty mock state
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1
            className="text-[23px] font-semibold text-foreground"
            style={{ letterSpacing: "-0.02em" }}
          >
            Gastos pendientes
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 leading-snug">
            Detectados desde tus correos del{" "}
            <strong className="text-primary">BCI</strong> o subiendo tu cartola. Confirma para clasificarlos.
          </p>
        </div>
        <CartolaUpload />
      </div>
      <PendingExpenseList
        items={items}
        categories={categories}
        suggestions={suggestions}
        memberCount={memberCount}
      />
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
