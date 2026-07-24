import { cache } from "react";
import { db } from "@/shared/lib/db";
import { householdMember, householdInvite, household } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getDisplayNamesByIds } from "@/shared/lib/supabase/admin";

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

export async function getHouseholdMembers(householdId: string) {
  'use cache'
  cacheTag(householdId, hhTag(householdId, "members"))

  const rows = await db
    .select({
      id: householdMember.id,
      userId: householdMember.userId,
      role: householdMember.role,
      displayName: householdMember.displayName,
      joinedAt: householdMember.joinedAt,
    })
    .from(householdMember)
    .where(eq(householdMember.householdId, householdId));

  // Only legacy rows without a persisted display_name need the Admin API.
  // Resolve them all in a SINGLE listUsers call (no N+1).
  const missingIds = rows.filter((m) => !m.displayName).map((m) => m.userId);
  const resolved =
    missingIds.length > 0
      ? await getDisplayNamesByIds(missingIds)
      : new Map<string, string>();

  return rows.map((m) => ({
    ...m,
    displayName: m.displayName ?? resolved.get(m.userId) ?? "Usuario",
  }));
}

export async function getActiveInvites(householdId: string) {
  return db
    .select()
    .from(householdInvite)
    .where(
      eq(householdInvite.householdId, householdId)
    )
    .then((rows) =>
      rows.filter(
        (r) => r.redeemedAt === null && r.expiresAt > new Date()
      )
    );
}
