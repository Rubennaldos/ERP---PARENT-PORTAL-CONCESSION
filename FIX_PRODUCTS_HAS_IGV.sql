-- ============================================================
-- FIX: Agregar columna has_igv a la tabla products
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_igv BOOLEAN DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name = 'has_igv';
