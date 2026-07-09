-- Boleta fotografiada: detalle de líneas extraído por IA + ruta del
-- comprobante en el bucket privado `receipts` de Supabase Storage.
ALTER TABLE "expense"
  ADD COLUMN IF NOT EXISTS "receipt_items" jsonb,
  ADD COLUMN IF NOT EXISTS "receipt_image_path" text;

-- Storage: bucket privado + acceso por hogar (path = {householdId}/{uuid}.jpg).
-- Aplicado directo en prod (drizzle-kit no gestiona storage) — referencia:
INSERT INTO storage.buckets (id, name, public)
  VALUES ('receipts', 'receipts', false)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "receipts_insert_household" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'receipts'
      AND public.is_household_member(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "receipts_select_household" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'receipts'
      AND public.is_household_member(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
