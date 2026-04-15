import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const household = pgTable("household", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: uuid("created_by").notNull(), // references auth.users(id)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const householdMember = pgTable(
  "household_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // references auth.users(id)
    role: text("role", { enum: ["owner", "member"] }).notNull(),
    displayName: text("display_name"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("uq_household_user").on(table.householdId, table.userId)]
);

export const householdInvite = pgTable("household_invite", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdBy: uuid("created_by").notNull(), // references auth.users(id)
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '7 days'`),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  redeemedBy: uuid("redeemed_by"), // references auth.users(id)
});
