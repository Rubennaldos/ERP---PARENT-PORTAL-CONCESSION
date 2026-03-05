-- ============================================================
-- SOLO LOS SEGUNDOS (PLATOS PRINCIPALES)
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

SELECT DISTINCT
  lm.main_course AS segundo_plato_principal
FROM public.lunch_menus lm
WHERE lm.main_course IS NOT NULL 
  AND lm.main_course != ''
ORDER BY lm.main_course;
