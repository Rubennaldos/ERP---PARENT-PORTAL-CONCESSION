-- ============================================
-- BORRAR COLEGIOS DE PRUEBA (A, B, C)
-- ============================================
-- Ejecutar en: Supabase SQL Editor

-- Ver qué colegios existen actualmente
SELECT * FROM schools ORDER BY name;

-- ============================================
-- OPCIÓN 1: Borrar solo los colegios A, B, C
-- ============================================
DELETE FROM schools 
WHERE code IN ('colegio-a', 'colegio-b', 'colegio-c', 'SEDE_A', 'SEDE_B', 'SEDE_C')
OR name IN ('Colegio A', 'Colegio B', 'Colegio C');

-- ============================================
-- OPCIÓN 2: Borrar TODOS los colegios (empezar de cero)
-- ============================================
-- ⚠️ CUIDADO: Esto borra TODO
-- DELETE FROM schools;

-- ============================================
-- Verificar que se borraron
-- ============================================
SELECT * FROM schools ORDER BY name;

-- ============================================
-- NOTA: Si hay estudiantes vinculados a estos colegios,
-- es posible que necesites borrarlos primero:
-- ============================================
-- DELETE FROM students WHERE school_id IN (
--   SELECT id FROM schools WHERE code IN ('colegio-a', 'colegio-b', 'colegio-c')
-- );

