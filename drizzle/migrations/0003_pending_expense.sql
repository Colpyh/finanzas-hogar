CREATE TABLE "card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"last_four" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"credit_limit" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"type" text DEFAULT 'salary' NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'CLP' NOT NULL,
	"period_month" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_income_type" CHECK (type IN ('salary', 'other'))
);
--> statement-breakpoint
CREATE TABLE "pending_expense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"parsed_amount" numeric(12, 2),
	"parsed_currency" text DEFAULT 'CLP',
	"parsed_date" date,
	"parsed_time" text,
	"parsed_merchant" text,
	"parsed_card_last4" text,
	"parsed_source" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expense_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_expense_payload_hash_unique" UNIQUE("payload_hash")
);
--> statement-breakpoint
ALTER TABLE "fixed_expense_payment" DROP CONSTRAINT "uq_expense_period";--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "responsible_id" uuid;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "card_id" uuid;--> statement-breakpoint
ALTER TABLE "fixed_expense_payment" ADD COLUMN "status" text DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "household_member" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_expense" ADD CONSTRAINT "pending_expense_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_expense" ADD CONSTRAINT "pending_expense_expense_id_expense_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_expense_household_status_created_idx" ON "pending_expense" USING btree ("household_id","status","created_at");--> statement-breakpoint
ALTER TABLE "fixed_expense_payment" ADD CONSTRAINT "uq_expense_period_user" UNIQUE("expense_id","period_month","paid_by");--> statement-breakpoint
ALTER TABLE "fixed_expense_payment" ADD CONSTRAINT "chk_payment_status" CHECK (status IN ('reserved', 'paid'));