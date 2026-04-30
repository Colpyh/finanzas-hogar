import webpush from "web-push";
import { db } from "@/shared/lib/db";
import { pushSubscription } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";

function initVapid() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushToHousehold(
  householdId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!initVapid()) return [];

  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.householdId, householdId));

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  return results;
}
