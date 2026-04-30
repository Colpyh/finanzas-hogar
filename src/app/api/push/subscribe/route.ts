import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { db } from "@/shared/lib/db";
import { pushSubscription } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

async function getAuthContext(req: NextRequest) {
  let user: Awaited<ReturnType<typeof getUser>>;
  try {
    user = await getUser();
  } catch {
    return null;
  }
  const household = await getUserHousehold(user.id);
  if (!household) return null;
  return { user, household };
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { endpoint, p256dh, auth } = parsed.data;

  // Upsert — if endpoint already exists, update keys (handles key rotation)
  await db
    .insert(pushSubscription)
    .values({
      householdId: ctx.household.id,
      userId: ctx.user.id,
      endpoint,
      p256dh,
      auth,
    })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { p256dh, auth, householdId: ctx.household.id, userId: ctx.user.id },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = z.object({ endpoint: z.string().url() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await db
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.endpoint, parsed.data.endpoint),
        eq(pushSubscription.householdId, ctx.household.id)
      )
    );

  return NextResponse.json({ ok: true });
}
