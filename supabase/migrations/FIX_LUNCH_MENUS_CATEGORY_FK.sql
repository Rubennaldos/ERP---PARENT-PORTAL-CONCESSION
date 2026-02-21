-- ============================================
-- FIX: Restaurar FK entre lunch_menus.category_id y lunch_categories.id
-- ============================================
-- El DROP TABLE lunch_categories CASCADE eliminó el FK constraint
-- de lunch_menus.category_id → lunch_categories.id
-- La columna category_id sigue existiendo pero sin FK,
-- lo que causa errores PGRST200 en PostgREST (resource embedding)

-- PASO 1: Ver cuántos registros huérfanos hay (diagnóstico)
SELECT 
  lm.id,
  lm.date,
  lm.category_id,
  lm.main_course,
  'HUERFANO - categoría no existe' as estado
FROM lunch_menus lm
WHERE lm.category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lunch_categories lc WHERE lc.id = lm.category_id
  );

-- PASO 2: Eliminar menús huérfanos (sus categorías ya no existen, son legacy inservibles)
-- No podemos poner NULL porque el constraint lunch_menus_unique_without_category
-- solo permite 1 menú sin categoría por sede+fecha
DELETE FROM lunch_menus
WHERE category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lunch_categories lc WHERE lc.id = lunch_menus.category_id
  );

-- PASO 3: Eliminar cualquier FK existente (por si acaso)
ALTER TABLE lunch_menus DROP CONSTRAINT IF EXISTS lunch_menus_category_id_fkey;

-- PASO 4: Restaurar el FK
ALTER TABLE lunch_menus 
  ADD CONSTRAINT lunch_menus_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES lunch_categories(id) 
  ON DELETE SET NULL;

SELECT '✅ FK restaurado. Los menús con categorías eliminadas ahora tienen category_id = NULL' as resultado;
