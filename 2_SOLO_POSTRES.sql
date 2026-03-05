-- ============================================================
-- SOLO LOS POSTRES
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

SELECT DISTINCT
  lm.dessert AS postre
FROM public.lunch_menus lm
WHERE lm.dessert IS NOT NULL 
  AND lm.dessert != ''
ORDER BY lm.dessert;
