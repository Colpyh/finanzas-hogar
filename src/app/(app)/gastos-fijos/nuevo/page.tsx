import type { Metadata } from "next";
import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { FixedExpenseForm } from "@/gastos-fijos/components/fixed-expense-form";
import { getHouseholdMembers } from "@/household/queries";
import { getHouseholdCards, getCardUsageSummary } from "@/tarjetas/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = { title: "Nuevo Gasto Fijo" };

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type Card = { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; used: number };

const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Vivienda" },
  { id: "cat-2", name: "Alimentación" },
  { id: "cat-3", name: "Transporte" },
  { id: "cat-4", name: "Salud" },
  { id: "cat-5", name: "Tecnología" },
  { id: "cat-6", name: "Entretenimiento" },
  { id: "cat-7", name: "Vestuario" },
  { id: "cat-8", name: "Otros" },
];

export default async function NuevoGastoFijoPage() {
  let categories: Category[] = MOCK_CATEGORIES;
  let members: Member[] = [];
  let cards: Card[] = [];

  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (household) {
      const month = currentPeriodMonth();
      const [cats, rawMembers, rawCards, usageMap] = await Promise.all([
        db
          .select({ id: category.id, name: category.name })
          .from(category)
          .where(or(isNull(category.householdId), eq(category.householdId, household.id)))
          .orderBy(category.name),
        getHouseholdMembers(household.id),
        getHouseholdCards(household.id),
        getCardUsageSummary(household.id, month),
      ]);
      categories = cats;
      members = rawMembers.map((m) => ({
        userId: m.userId,
        displayName: m.displayName ?? m.userId,
      }));
      cards = rawCards.map((c) => ({
        id: c.id,
        name: c.name,
        lastFour: c.lastFour,
        color: c.color,
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        used: usageMap.get(c.id) ?? 0,
      }));
    }
  } catch {
    // Sin sesión — categorías de ejemplo
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/gastos-fijos" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo gasto fijo</h1>
      </div>
      <FixedExpenseForm categories={categories} members={members} cards={cards} />
    </div>
  );
}
