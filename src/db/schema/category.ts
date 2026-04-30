import { pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { household } from "./household";

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  // NULL = system-level category visible to all households
  householdId: uuid("household_id").references(() => household.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  monthlyBudget: numeric("monthly_budget", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
