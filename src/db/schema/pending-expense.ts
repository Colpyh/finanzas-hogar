import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { household } from "./household";
import { expense } from "./expense";

export const pendingExpense = pgTable(
  "pending_expense",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),

    // Dueño de este pendiente (household.emailForwarderUserId al momento de
    // la ingesta) — solo esa persona lo ve hasta confirmarlo. Null = el
    // hogar no tenía forwarder configurado cuando llegó este correo.
    // References auth.users(id).
    createdByUserId: uuid("created_by_user_id"),

    // Full Postmark payload — never discard
    rawPayload: jsonb("raw_payload").notNull(),

    // SHA-256 of Postmark MessageID — unique for idempotency
    payloadHash: text("payload_hash").notNull().unique(),

    // Parsed fields (nullable so a parser miss still stores the row for inspection)
    parsedAmount: numeric("parsed_amount", { precision: 12, scale: 2 }),
    parsedCurrency: text("parsed_currency").default("CLP"),
    parsedDate: date("parsed_date", { mode: "string" }),
    parsedTime: text("parsed_time"),
    parsedMerchant: text("parsed_merchant"),
    parsedCardLast4: text("parsed_card_last4"),
    parsedSource: text("parsed_source", { enum: ["bci", "unknown"] })
      .notNull()
      .default("unknown"),

    status: text("status", { enum: ["pending", "confirmed", "discarded"] })
      .notNull()
      .default("pending"),

    // Set when confirmed
    expenseId: uuid("expense_id").references(() => expense.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pending_expense_household_status_created_idx").on(
      table.householdId,
      table.status,
      table.createdAt
    ),
  ]
);

export type PendingExpense = typeof pendingExpense.$inferSelect;
export type NewPendingExpense = typeof pendingExpense.$inferInsert;
export type PendingExpenseRow = Omit<PendingExpense, "rawPayload">;
