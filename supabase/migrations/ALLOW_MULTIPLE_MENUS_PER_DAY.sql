-- ============================================
-- PERMITIR MÚLTIPLES MENÚS POR DÍA
-- ============================================
-- Eliminar la restricción que impide tener múltiples menús
-- en la misma sede para la misma fecha.
-- Ahora con categorías, podemos tener:
-- - Almuerzo Clásico para alumnos
-- - Almuerzo Light para alumnos
-- - Almuerzo para Profesores
-- Todo en el mismo día y la misma sede.

-- Eliminar la restricción única de school_id + date
ALTER TABLE lunch_menus DROP CONSTRAINT IF EXISTS lunch_menus_school_id_date_key;

-- Ahora la unicidad debería ser: school_id + date + category_id + target_type
-- Pero como category_id puede ser NULL, vamos a crear un índice único parcial

-- Crear un índice único para evitar duplicados SOLO cuando hay categoría
CREATE UNIQUE INDEX IF NOT EXISTS lunch_menus_unique_with_category 
ON lunch_menus (school_id, date, category_id, target_type)
WHERE category_id IS NOT NULL;

-- Para menús sin categoría (legacy), permitir solo uno por día
CREATE UNIQUE INDEX IF NOT EXISTS lunch_menus_unique_without_category 
ON lunch_menus (school_id, date)
WHERE category_id IS NULL;

SELECT '✅ Ahora puedes crear múltiples menús por día con diferentes categorías' as resultado;
