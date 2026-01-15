-- ================================================================
-- SCRIPT DE LIMPIEZA: Lunch Menus con datos NULL o vacíos
-- ================================================================
-- Este script identifica y limpia menús con datos problemáticos
-- que están causando keys duplicadas en el dashboard de Analytics
-- ================================================================

-- PASO 1: Ver cuántos registros tienen campos NULL o vacíos
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN starter IS NULL OR starter = '' THEN 1 END) as entradas_vacias,
  COUNT(CASE WHEN main_course IS NULL OR main_course = '' THEN 1 END) as segundos_vacios,
  COUNT(CASE WHEN beverage IS NULL OR beverage = '' THEN 1 END) as bebidas_vacias,
  COUNT(CASE WHEN dessert IS NULL OR dessert = '' THEN 1 END) as postres_vacios,
  COUNT(CASE WHEN school_id IS NULL THEN 1 END) as sin_sede
FROM lunch_menus;

-- PASO 2: Ver registros específicos con problemas
SELECT 
  id,
  date,
  school_id,
  starter,
  main_course,
  beverage,
  dessert,
  created_at
FROM lunch_menus
WHERE 
  (starter IS NULL OR starter = '' OR TRIM(starter) = '')
  OR (main_course IS NULL OR main_course = '' OR TRIM(main_course) = '')
  OR (beverage IS NULL OR beverage = '' OR TRIM(beverage) = '')
  OR (dessert IS NULL OR dessert = '' OR TRIM(dessert) = '')
  OR school_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- PASO 3: OPCIÓN A - Actualizar campos vacíos con valores por defecto
-- (DESCOMENTAR SI DESEAS EJECUTAR ESTA OPCIÓN)
/*
UPDATE lunch_menus
SET 
  starter = COALESCE(NULLIF(TRIM(starter), ''), 'Sin entrada'),
  main_course = COALESCE(NULLIF(TRIM(main_course), ''), 'Sin segundo'),
  beverage = COALESCE(NULLIF(TRIM(beverage), ''), 'Sin bebida'),
  dessert = COALESCE(NULLIF(TRIM(dessert), ''), 'Sin postre')
WHERE 
  (starter IS NULL OR starter = '' OR TRIM(starter) = '')
  OR (main_course IS NULL OR main_course = '' OR TRIM(main_course) = '')
  OR (beverage IS NULL OR beverage = '' OR TRIM(beverage) = '')
  OR (dessert IS NULL OR dessert = '' OR TRIM(dessert) = '');
*/

-- PASO 4: OPCIÓN B - Eliminar registros completamente vacíos
-- (DESCOMENTAR SI DESEAS EJECUTAR ESTA OPCIÓN - MÁS AGRESIVO)
/*
DELETE FROM lunch_menus
WHERE 
  (starter IS NULL OR starter = '' OR TRIM(starter) = '')
  AND (main_course IS NULL OR main_course = '' OR TRIM(main_course) = '')
  AND (beverage IS NULL OR beverage = '' OR TRIM(beverage) = '')
  AND (dessert IS NULL OR dessert = '' OR TRIM(dessert) = '');
*/

-- PASO 5: Agregar constraints para prevenir datos vacíos en el futuro
-- (DESCOMENTAR SI DESEAS EJECUTAR ESTA OPCIÓN)
/*
ALTER TABLE lunch_menus
  ALTER COLUMN starter SET DEFAULT 'Sin entrada',
  ALTER COLUMN main_course SET DEFAULT 'Sin segundo',
  ALTER COLUMN beverage SET DEFAULT 'Sin bebida',
  ALTER COLUMN dessert SET DEFAULT 'Sin postre';

-- Agregar checks para evitar strings vacíos
ALTER TABLE lunch_menus
  ADD CONSTRAINT check_starter_not_empty CHECK (TRIM(starter) != ''),
  ADD CONSTRAINT check_main_course_not_empty CHECK (TRIM(main_course) != ''),
  ADD CONSTRAINT check_beverage_not_empty CHECK (TRIM(beverage) != ''),
  ADD CONSTRAINT check_dessert_not_empty CHECK (TRIM(dessert) != '');
*/

-- ================================================================
-- INSTRUCCIONES DE USO:
-- ================================================================
-- 1. Primero ejecuta PASO 1 y PASO 2 para ver qué datos tienes
-- 2. Si hay registros problemáticos, decide:
--    - OPCIÓN A: Actualizar con valores por defecto (recomendado)
--    - OPCIÓN B: Eliminar registros vacíos (más agresivo)
-- 3. Descomenta la opción que prefieras y ejecútala
-- 4. Opcionalmente, ejecuta PASO 5 para prevenir futuros problemas
-- ================================================================
