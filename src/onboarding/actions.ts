"use server";

import { db } from "@/shared/lib/db";
import { household, householdMember, householdInvite } from "@/shared/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getUser } from "@/auth/queries";
import { createHouseholdSchema, redeemInviteSchema } from "./types";
import { userHouseholdTag } from "./queries";
import { validateInviteRedemption } from "./invite-validation";

export async function createHousehold(rawData: unknown) {
  const user = await getUser();
  const { name } = createHouseholdSchema.parse(rawData);

  const [newHousehold] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(household)
      .values({ name, createdBy: user.id })
      .returning();

    await tx.insert(householdMember).values({
      householdId: created!.id,
      userId: user.id,
      role: "owner",
      displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
    });

    return [created];
  });

  updateTag(userHouseholdTag(user.id));
  redirect("/dashboard");
  return newHousehold;
}

export async function createHouseholdAndReturn(
  rawData: unknown
): Promise<{ householdId?: string; error?: string }> {
  try {
    const user = await getUser();
    const { name } = createHouseholdSchema.parse(rawData);

    const [newHousehold] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(household)
        .values({ name, createdBy: user.id })
        .returning();

      await tx.insert(householdMember).values({
        householdId: created!.id,
        userId: user.id,
        role: "owner",
        displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
      });

      return [created];
    });

    updateTag(userHouseholdTag(user.id));
    return { householdId: newHousehold!.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al crear el hogar" };
  }
}

export async function redeemInvite(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const { token } = redeemInviteSchema.parse(rawData);

  // Load invite + member count in parallel
  const [inviteRows, memberCountRows] = await Promise.all([
    db
      .select()
      .from(householdInvite)
      .where(eq(householdInvite.token, token))
      .limit(1),
    db
      .select({ value: count() })
      .from(householdMember)
      .where(
        eq(
          householdMember.householdId,
          db
            .select({ id: householdInvite.householdId })
            .from(householdInvite)
            .where(eq(householdInvite.token, token))
            .limit(1)
        )
      ),
  ]);

  const invite = inviteRows[0];
  if (!invite) {
    return { error: "Enlace de invitación no encontrado" };
  }

  const memberCount = memberCountRows[0]?.value ?? 0;

  const validation = validateInviteRedemption({
    expiresAt: invite.expiresAt.toISOString(),
    redeemedAt: invite.redeemedAt?.toISOString() ?? null,
    memberCount: Number(memberCount),
  });

  if (!validation.ok) {
    return { error: validation.error };
  }

  await db.transaction(async (tx) => {
    await tx.insert(householdMember).values({
      householdId: invite.householdId,
      userId: user.id,
      role: "member",
      displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
    });

    await tx
      .update(householdInvite)
      .set({ redeemedAt: new Date(), redeemedBy: user.id })
      .where(eq(householdInvite.token, token));
  });

  updateTag(invite.householdId);
  updateTag(userHouseholdTag(user.id));
  redirect("/dashboard");
  return {};
}
