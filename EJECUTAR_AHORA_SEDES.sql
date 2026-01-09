-- =========================================
-- PASO 1: VERIFICAR PADRES SIN SEDE
-- =========================================
-- Ejecuta esto primero para ver quiénes están sin sede

SELECT 
  p.email,
  pp.full_name,
  pp.school_id,
  s.name as sede_actual
FROM parent_profiles pp
LEFT JOIN profiles p ON p.id = pp.user_id
LEFT JOIN schools s ON s.id = pp.school_id
WHERE p.role = 'parent'
ORDER BY pp.full_name;

-- =========================================
-- PASO 2: ASIGNAR SEDES
-- =========================================

-- Opción RECOMENDADA: Asignar según el primer hijo
-- (Usa la sede del primer estudiante que registraron)
WITH student_schools AS (
  SELECT DISTINCT ON (sr.parent_id)
    sr.parent_id,
    s.school_id,
    sch.name as school_name
  FROM student_relationships sr
  INNER JOIN students s ON s.id = sr.student_id
  INNER JOIN schools sch ON sch.id = s.school_id
  WHERE sr.parent_id IS NOT NULL
  ORDER BY sr.parent_id, sr.created_at ASC
)
UPDATE parent_profiles pp
SET school_id = ss.school_id
FROM student_schools ss
WHERE pp.user_id = ss.parent_id
  AND (pp.school_id IS NULL OR pp.school_id != ss.school_id);

-- Ver el resultado
SELECT 
  p.email,
  pp.full_name,
  s.name as sede_asignada
FROM parent_profiles pp
LEFT JOIN profiles p ON p.id = pp.user_id
LEFT JOIN schools s ON s.id = pp.school_id
WHERE p.role = 'parent'
ORDER BY s.name, pp.full_name;

-- =========================================
-- PASO 3: VERIFICAR QUE NO QUEDEN SIN SEDE
-- =========================================
SELECT 
  COUNT(*) as padres_sin_sede,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ TODOS TIENEN SEDE'
    ELSE '❌ AÚN HAY PADRES SIN SEDE'
  END as estado
FROM parent_profiles pp
LEFT JOIN profiles p ON p.id = pp.user_id
WHERE p.role = 'parent' AND pp.school_id IS NULL;

