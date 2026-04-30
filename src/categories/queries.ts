import { db } from "@/shared/lib/db";
import { category } from "@/shared/lib/db/schema";
import { or, isNull, eq, asc } from "drizzle-orm";

export async function getCategories(householdId: string) {
  return db
    .select()
    .from(category)
    .where(or(isNull(category.householdId), eq(category.householdId, householdId)))
    .orderBy(asc(category.name));
}
