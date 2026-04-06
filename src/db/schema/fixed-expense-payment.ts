import { pgTable, uuid, text, timestamp, numeric, date, unique } from "drizzle-orm/pg-core";
import { expense } from "./expense";
import { household } from "./household";

export const fixedExpensePayment = pgTable(
  "fixed_expense_payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expense.id, { onDelete: "cascade" }),
    // Denormalized for RLS — avoids JOIN on every policy check
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    paidBy: uuid("paid_by").notNull(), // references auth.users(id)
    periodMonth: date("period_month", { mode: "string" }).notNull(), // 'YYYY-MM-01'
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // actual paid amount
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
    notes: text("notes"),
  },
  (table) => [
    // Prevents double-payment for the same bill in the same month (Scenario 2.6)
    unique("uq_expense_period").on(table.expenseId, table.periodMonth),
  ]
);
