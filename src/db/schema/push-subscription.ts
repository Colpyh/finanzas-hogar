import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { household } from "./household";

export const pushSubscription = pgTable("push_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PushSubscription = typeof pushSubscription.$inferSelect;
export type NewPushSubscription = typeof pushSubscription.$inferInsert;
