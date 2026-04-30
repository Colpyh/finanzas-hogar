import webpush from "web-push";
import { db } from "@/shared/lib/db";
import { pushSubscription } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToHousehold(
  householdId: string,
  payload: { title: string; body: string; url?: string }
) {
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
