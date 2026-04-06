import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { NuevoCompraClient } from "./client";

export async function NuevoCompraPageWrapper() {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const categories = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(or(isNull(category.householdId), eq(category.householdId, household.id)))
    .orderBy(category.name);

  return <NuevoCompraClient categories={categories} />;
}
