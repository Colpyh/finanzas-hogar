-- Tipo de tarjeta: crédito (default, comportamiento actual) o débito
-- (sin ciclo de facturación; compras nacen pagadas automáticamente).
ALTER TABLE "card"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'credit';
