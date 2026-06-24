import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { household } from "./household";

export const income = pgTable(
  "income",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull(), // references auth.users(id)
    // 'salary' = sueldo mensual, 'other' = ingreso puntual (bono, freelance, etc.)
    type: text("type").notNull().default("salary"),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("CLP"),
    periodMonth: date("period_month", { mode: "string" }).notNull(), // 'YYYY-MM-01'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("chk_income_type", sql`type IN ('salary', 'other')`),
    index("idx_income_household_period").on(table.householdId, table.periodMonth),
  ]
);
