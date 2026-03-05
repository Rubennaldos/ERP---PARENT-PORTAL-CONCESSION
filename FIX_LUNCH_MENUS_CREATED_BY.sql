-- ============================================================
-- FIX: Agregar columna created_by a lunch_menus
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

ALTER TABLE public.lunch_menus
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Refrescar schema cache de Supabase
NOTIFY pgrst, 'reload schema';

-- Verificar que se agregó correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lunch_menus'
  AND column_name = 'created_by';
