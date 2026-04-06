import { db } from "@/shared/lib/db";
import { householdMember, householdInvite } from "@/shared/lib/db/schema";
import { eq, isNull, gt } from "drizzle-orm";

export async function getHouseholdMembers(householdId: string) {
  return db
    .select()
    .from(householdMember)
    .where(eq(householdMember.householdId, householdId));
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
