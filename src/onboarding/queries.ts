import { cache } from "react";
import { db } from "@/shared/lib/db";
import { householdMember, householdInvite, household } from "@/shared/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

// cache() deduplicates within a single render tree (layout + page share the result)
export const getUserHousehold = cache(async function getUserHousehold(userId: string) {
  const result = await db
    .select({
      id: household.id,
      name: household.name,
      role: householdMember.role,
    })
    .from(householdMember)
    .innerJoin(household, eq(householdMember.householdId, household.id))
    .where(eq(householdMember.userId, userId))
    .limit(1);

  return result[0] ?? null;
});

export async function getInviteByToken(token: string) {
  const now = new Date();

  const result = await db
    .select({
      id: householdInvite.id,
      householdId: householdInvite.householdId,
      householdName: household.name,
      token: householdInvite.token,
      expiresAt: householdInvite.expiresAt,
      redeemedAt: householdInvite.redeemedAt,
    })
    .from(householdInvite)
    .innerJoin(household, eq(householdInvite.householdId, household.id))
    .where(
      and(
        eq(householdInvite.token, token),
        isNull(householdInvite.redeemedAt),
        gt(householdInvite.expiresAt, now)
      )
    )
    .limit(1);

  return result[0] ?? null;
}
