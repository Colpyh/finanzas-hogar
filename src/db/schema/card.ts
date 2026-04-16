import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { household } from "./household";

export const card = pgTable("card", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lastFour: text("last_four"), // optional last 4 digits for display
  color: text("color").notNull().default("#6366f1"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }), // nullable — no limit if null
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
