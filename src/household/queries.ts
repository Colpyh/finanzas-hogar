import { db } from "@/shared/lib/db";
import { householdMember, householdInvite } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getDisplayNamesByIds } from "@/shared/lib/supabase/admin";

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
