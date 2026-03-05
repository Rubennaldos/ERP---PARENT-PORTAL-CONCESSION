-- ============================================================
-- SOLO LAS ENTRADAS
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

SELECT DISTINCT
  lm.starter AS entrada
FROM public.lunch_menus lm
WHERE lm.starter IS NOT NULL 
  AND lm.starter != ''
ORDER BY lm.starter;
