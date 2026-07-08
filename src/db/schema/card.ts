import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  smallint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { household } from "./household";

export const card = pgTable(
  "card",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    lastFour: text("last_four"), // optional last 4 digits for display
    // 'credit' | 'debit' — débito no tiene ciclo de facturación y sus compras nacen pagadas
    kind: text("kind").notNull().default("credit"),
    color: text("color").notNull().default("#6366f1"),
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }), // nullable — no limit if null
    // Billing cycle fields (nullable — debit cards / cards without cycle tracking leave these null)
    closingDay: smallint("closing_day"),   // day of month the billing period closes (1-28)
    paymentDueDay: smallint("payment_due_day"), // day of month the payment is due
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_card_household").on(table.householdId)]
);
