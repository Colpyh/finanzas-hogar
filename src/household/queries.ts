import { db } from "@/shared/lib/db";
import { householdMember, householdInvite } from "@/shared/lib/db/schema";
import { eq, isNull, gt } from "drizzle-orm";
import { getUserDisplayName } from "@/shared/lib/supabase/admin";

export async function getHouseholdMembers(householdId: string) {
  const rows = await db
    .select()
    .from(householdMember)
    .where(eq(householdMember.householdId, householdId));

  return Promise.all(
    rows.map(async (m) => ({
      ...m,
      displayName: await getUserDisplayName(m.userId),
    }))
  );
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
