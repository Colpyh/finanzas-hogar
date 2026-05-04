import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  smallint,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { household } from "./household";
import { category } from "./category";

export const expense = pgTable("expense", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => household.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull(), // references auth.users(id)
  // Null = gasto del hogar completo. Uuid = gasto personal de ese miembro.
  ownerId: uuid("owner_id"),
  // Null = sin responsable definido. Uuid = miembro que paga físicamente (tarjeta/cuenta).
  responsibleId: uuid("responsible_id"),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => category.id),
  type: text("type", {
    enum: ["fixed", "one_time", "installment", "variable"],
  }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("ARS"),

  // Fixed expense fields
  recurrenceDay: smallint("recurrence_day"), // 1-31, day of month bill is due
  isActive: boolean("is_active").default(true), // toggle without deleting
  isShared: boolean("is_shared").default(false).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),

  // Installment fields
  installmentsTotal: smallint("installments_total"),
  installmentsPaid: smallint("installments_paid").default(0),
  installmentAmount: numeric("installment_amount", { precision: 12, scale: 2 }),
  startMonth: date("start_month", { mode: "string" }), // YYYY-MM-DD (truncated to 1st)

  // One-time fields
  expenseDate: date("expense_date", { mode: "string" }), // date of purchase

  // Card reference (optional — which card was used for this expense)
  cardId: uuid("card_id"),

  // Soft delete
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
