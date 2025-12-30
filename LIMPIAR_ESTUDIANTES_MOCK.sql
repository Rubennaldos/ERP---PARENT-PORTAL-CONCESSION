-- ========================================================
-- LIMPIAR ESTUDIANTES MOCK Y VERIFICAR SOLO REALES
-- ========================================================

-- 1. VER TODOS LOS ESTUDIANTES ACTUALES
SELECT 
  id,
  full_name,
  parent_id,
  grade,
  section,
  balance,
  created_at,
  is_active
FROM students
ORDER BY created_at DESC;

-- 2. IDENTIFICAR ESTUDIANTES SIN PADRE ASIGNADO (probablemente mock)
SELECT 
  id,
  full_name,
  parent_id,
  'SIN PADRE' as status
FROM students
WHERE parent_id IS NULL;

-- 3. ELIMINAR ESTUDIANTES MOCK (SIN PADRE)
-- ⚠️ EJECUTA ESTO SOLO SI ESTÁS SEGURO
/*
DELETE FROM students
WHERE parent_id IS NULL
AND full_name IN (
  'Pedro García',
  'María López',
  'Juan Martínez',
  'Ana Silva',
  'Carlos Rodríguez'
);
*/

-- 4. VERIFICAR ESTUDIANTES RESTANTES
SELECT 
  s.full_name as estudiante,
  p.email as email_padre,
  s.grade,
  s.section,
  s.balance,
  s.created_at
FROM students s
LEFT JOIN profiles p ON p.id = s.parent_id
WHERE s.is_active = TRUE
ORDER BY s.created_at DESC;

-- 5. ESTADÍSTICAS
SELECT 
  COUNT(*) as total_estudiantes,
  COUNT(parent_id) as con_padre,
  COUNT(*) - COUNT(parent_id) as sin_padre
FROM students
WHERE is_active = TRUE;

-- ========================================================
-- NOTA:
-- Si tienes estudiantes mock creados para pruebas,
-- ejecuta el DELETE (descomenta la sección 3).
-- 
-- Los estudiantes reales deben tener:
-- - parent_id asignado
-- - Creados desde el Portal de Padres (Register/Onboarding)
-- ========================================================

-- 6. (OPCIONAL) DESACTIVAR ESTUDIANTES MOCK EN LUGAR DE ELIMINAR
/*
UPDATE students
SET is_active = FALSE
WHERE parent_id IS NULL;
*/

