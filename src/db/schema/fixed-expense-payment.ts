import { pgTable, uuid, text, timestamp, numeric, date, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
    // 'reserved' = guardado chanchito (plata apartada, no entregada aún)
    // 'paid'     = pagado / entregado
    status: text("status").notNull().default("paid"),
    notes: text("notes"),
  },
  (table) => [
    unique("uq_expense_period_user").on(table.expenseId, table.periodMonth, table.paidBy),
    check("chk_payment_status", sql`status IN ('reserved', 'paid')`),
  ]
);
