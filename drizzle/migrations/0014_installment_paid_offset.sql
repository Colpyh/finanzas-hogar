-- Cuotas COMPARTIDAS: installmentsPaid se deriva de fixed_expense_payment
-- (meses pagados por todos los miembros). Este ajuste manual se suma a ese
-- conteo para poder corregir en qué cuota se va (cuotas pagadas antes de
-- usar la app, o un mes que no se registró). Ignorado en no compartidas.
ALTER TABLE "expense"
  ADD COLUMN IF NOT EXISTS "installments_paid_offset" smallint DEFAULT 0 NOT NULL;
