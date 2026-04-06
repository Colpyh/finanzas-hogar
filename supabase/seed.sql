-- System categories — household_id = NULL means visible to ALL households
-- Run once after initial migration
INSERT INTO public.category (id, name, icon, color, household_id)
VALUES
  (gen_random_uuid(), 'Alimentación',    '🛒', '#22c55e', NULL),
  (gen_random_uuid(), 'Servicios',       '💡', '#3b82f6', NULL),
  (gen_random_uuid(), 'Transporte',      '🚗', '#f59e0b', NULL),
  (gen_random_uuid(), 'Entretenimiento', '🎬', '#8b5cf6', NULL),
  (gen_random_uuid(), 'Salud',           '🏥', '#ef4444', NULL),
  (gen_random_uuid(), 'Vivienda',        '🏠', '#06b6d4', NULL),
  (gen_random_uuid(), 'Ropa',            '👕', '#ec4899', NULL),
  (gen_random_uuid(), 'Mascota',         '🐾', '#f97316', NULL),
  (gen_random_uuid(), 'Otros',           '📦', '#6b7280', NULL)
ON CONFLICT DO NOTHING;
