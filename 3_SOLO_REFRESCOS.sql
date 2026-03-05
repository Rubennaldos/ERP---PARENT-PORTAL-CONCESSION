-- ============================================================
-- SOLO LOS REFRESCOS
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

SELECT DISTINCT
  lm.beverage AS refresco
FROM public.lunch_menus lm
WHERE lm.beverage IS NOT NULL 
  AND lm.beverage != ''
ORDER BY lm.beverage;
