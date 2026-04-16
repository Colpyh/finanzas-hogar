import { db } from "@/shared/lib/db";
import { card } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getHouseholdCards(householdId: string) {
  return db
    .select()
    .from(card)
    .where(and(eq(card.householdId, householdId), eq(card.isActive, true)))
    .orderBy(card.createdAt);
}
