ALTER TABLE "expense" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "fixed_expense_payment" DROP CONSTRAINT "uq_expense_period";
--> statement-breakpoint
ALTER TABLE "fixed_expense_payment" ADD CONSTRAINT "uq_expense_period_user" UNIQUE("expense_id","period_month","paid_by");
