-- Performance indexes: household_id + deleted_at + period filters
-- NOTE: Drizzle migrations run inside a transaction, so CONCURRENTLY is NOT used here.
-- For zero-downtime application in production, use the CONCURRENTLY version in the Supabase SQL Editor instead.

-- expense
CREATE INDEX IF NOT EXISTS "idx_expense_household_deleted" ON "expense" ("household_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expense_household_type_deleted" ON "expense" ("household_id","type","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expense_card" ON "expense" ("card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expense_category" ON "expense" ("category_id");--> statement-breakpoint

-- fixed_expense_payment
CREATE INDEX IF NOT EXISTS "idx_fep_household_period" ON "fixed_expense_payment" ("household_id","period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fep_expense_period" ON "fixed_expense_payment" ("expense_id","period_month");--> statement-breakpoint

-- income
CREATE INDEX IF NOT EXISTS "idx_income_household_period" ON "income" ("household_id","period_month");--> statement-breakpoint

-- household_member
CREATE INDEX IF NOT EXISTS "idx_household_member_user" ON "household_member" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_household_member_household" ON "household_member" ("household_id");--> statement-breakpoint

-- category
CREATE INDEX IF NOT EXISTS "idx_category_household" ON "category" ("household_id");--> statement-breakpoint

-- card
CREATE INDEX IF NOT EXISTS "idx_card_household" ON "card" ("household_id");
