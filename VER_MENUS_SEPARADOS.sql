-- ============================================================
-- VER MENÚS SEPARADOS POR TIPO
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ============================================================
-- 1. SOLO LOS SEGUNDOS (PLATOS PRINCIPALES)
-- ============================================================

SELECT DISTINCT
  lm.main_course AS segundo_plato_principal
FROM public.lunch_menus lm
WHERE lm.main_course IS NOT NULL 
  AND lm.main_course != ''
ORDER BY lm.main_course;

-- ============================================================
-- 2. SOLO LOS POSTRES
-- ============================================================

SELECT DISTINCT
  lm.dessert AS postre
FROM public.lunch_menus lm
WHERE lm.dessert IS NOT NULL 
  AND lm.dessert != ''
ORDER BY lm.dessert;

-- ============================================================
-- 3. SOLO LOS REFRESCOS
-- ============================================================

SELECT DISTINCT
  lm.beverage AS refresco
FROM public.lunch_menus lm
WHERE lm.beverage IS NOT NULL 
  AND lm.beverage != ''
ORDER BY lm.beverage;

-- ============================================================
-- 4. SOLO LAS ENTRADAS
-- ============================================================

SELECT DISTINCT
  lm.starter AS entrada
FROM public.lunch_menus lm
WHERE lm.starter IS NOT NULL 
  AND lm.starter != ''
ORDER BY lm.starter;

-- ============================================================
-- BONUS: CONTAR CUÁNTAS VECES APARECE CADA PLATO
-- ============================================================

-- Contar segundos
SELECT 
  lm.main_course AS segundo_plato_principal,
  COUNT(*) AS veces_usado
FROM public.lunch_menus lm
WHERE lm.main_course IS NOT NULL 
  AND lm.main_course != ''
GROUP BY lm.main_course
ORDER BY veces_usado DESC, lm.main_course;

-- Contar postres
SELECT 
  lm.dessert AS postre,
  COUNT(*) AS veces_usado
FROM public.lunch_menus lm
WHERE lm.dessert IS NOT NULL 
  AND lm.dessert != ''
GROUP BY lm.dessert
ORDER BY veces_usado DESC, lm.dessert;

-- Contar refrescos
SELECT 
  lm.beverage AS refresco,
  COUNT(*) AS veces_usado
FROM public.lunch_menus lm
WHERE lm.beverage IS NOT NULL 
  AND lm.beverage != ''
GROUP BY lm.beverage
ORDER BY veces_usado DESC, lm.beverage;

-- Contar entradas
SELECT 
  lm.starter AS entrada,
  COUNT(*) AS veces_usado
FROM public.lunch_menus lm
WHERE lm.starter IS NOT NULL 
  AND lm.starter != ''
GROUP BY lm.starter
ORDER BY veces_usado DESC, lm.starter;
