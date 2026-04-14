"use server";

import crypto from "crypto";
import { db } from "@/shared/lib/db";
import { household, householdInvite } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { updateHouseholdSchema } from "./types";

export async function updateHousehold(rawData: unknown) {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) throw new Error("No household");

  const { name } = updateHouseholdSchema.parse(rawData);

  const [updated] = await db
    .update(household)
    .set({ name })
    .where(eq(household.id, userHousehold.id))
    .returning();

  revalidatePath("/ajustes");
  return updated;
}

export async function createInvite() {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) throw new Error("No household");
  if (userHousehold.role !== "owner") throw new Error("Solo el propietario puede invitar");

  // NFR-2: 256-bit entropy token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(householdInvite)
    .values({
      householdId: userHousehold.id,
      token,
      createdBy: user.id,
      expiresAt,
    })
    .returning();

  revalidatePath("/ajustes");
  return invite;
}

export async function generateInvite(): Promise<void> {
  await createInvite();
}

export async function revokeInvite(inviteId: string) {
  await getUser();

  await db
    .update(householdInvite)
    .set({ redeemedAt: new Date() })
    .where(eq(householdInvite.id, inviteId));

  revalidatePath("/ajustes");
}
