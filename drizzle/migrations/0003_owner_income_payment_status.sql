-- Migration 0003: owner_id en expense, status en fixed_expense_payment, tabla income

-- 1. Gastos personales: owner_id nullable en expense
--    NULL = gasto del hogar; UUID = gasto personal de ese miembro
ALTER TABLE "expense" ADD COLUMN "owner_id" uuid;

-- 2. Estado en confirmaciones de gastos fijos
--    'reserved' = guardado chanchito (plata apartada, no entregada aún)
--    'paid'     = pagado / entregado
--    DEFAULT 'paid' para que los registros existentes no cambien
ALTER TABLE "fixed_expense_payment"
  ADD COLUMN "status" text NOT NULL DEFAULT 'paid';

ALTER TABLE "fixed_expense_payment"
  ADD CONSTRAINT "chk_payment_status" CHECK (status IN ('reserved', 'paid'));

-- 3. Tabla de ingresos por miembro
CREATE TABLE "income" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id"  uuid NOT NULL REFERENCES "household"("id") ON DELETE CASCADE,
  "member_id"     uuid NOT NULL,
  "type"          text NOT NULL DEFAULT 'salary',
  "description"   text NOT NULL,
  "amount"        numeric(12, 2) NOT NULL,
  "currency"      text NOT NULL DEFAULT 'CLP',
  "period_month"  date NOT NULL,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_income_type" CHECK (type IN ('salary', 'other'))
);
