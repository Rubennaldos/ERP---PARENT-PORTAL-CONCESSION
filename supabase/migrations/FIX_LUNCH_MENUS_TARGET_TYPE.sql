-- ============================================
-- FIX: Actualizar lunch_menus con target_type NULL a 'both'
-- 
-- PROBLEMA: Los menús creados por carga masiva (MassUploadModal)
-- no incluían target_type, quedando como NULL.
-- Los profesores filtran por target_type = 'teachers' o 'both',
-- por lo que NO veían estos menús y no podían hacer pedidos.
--
-- SOLUCIÓN: Actualizar todos los menús sin target_type a 'both'
-- para que sean visibles tanto para alumnos como para profesores.
-- ============================================

-- Paso 1: Ver cuántos menús tienen target_type NULL
SELECT 
  target_type,
  COUNT(*) as cantidad
FROM lunch_menus
GROUP BY target_type
ORDER BY target_type;

-- Paso 2: Actualizar los menús sin target_type a 'both'
UPDATE lunch_menus
SET target_type = 'both'
WHERE target_type IS NULL;

-- Paso 3: Verificar el resultado
SELECT 
  target_type,
  COUNT(*) as cantidad
FROM lunch_menus
GROUP BY target_type
ORDER BY target_type;
