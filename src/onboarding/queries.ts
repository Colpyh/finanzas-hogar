import { cache } from "react";
import { cacheTag } from "next/cache";
import { db } from "@/shared/lib/db";
import { householdMember, householdInvite, household } from "@/shared/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

/**
 * Tag de caché para la membresía de un usuario. Invalidar (updateTag) en
 * cualquier mutación que cree o elimine su fila de householdMember:
 * crear hogar, canjear invitación, addMemberByEmail, removeMember.
 */
export function userHouseholdTag(userId: string): string {
  return `user-household-${userId}`;
}

async function fetchUserHousehold(userId: string) {
  'use cache'
  cacheTag(userHouseholdTag(userId))
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

  const found = result[0] ?? null;
  // También taggear por hogar: updateTag(householdId) (renombre, remoción)
  // invalida la membresía cacheada de todos sus miembros.
  if (found) cacheTag(found.id);
  return found;
}

// cache() deduplicates within a single render tree (layout + page share the result)
export const getUserHousehold = cache(fetchUserHousehold);

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
