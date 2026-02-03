-- =====================================================
-- 🔍 DIAGNÓSTICO PASO A PASO
-- =====================================================
-- Ejecuta cada consulta UNA POR UNA y comparte el resultado

-- ========================================
-- PASO 1: Verificar el admin y su sede
-- ========================================
-- EJECUTA ESTA PRIMERO:

SELECT 
  p.id as user_id,
  p.email,
  p.role,
  p.school_id,
  s.name as school_name,
  s.code as school_code
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'adminjbl@limacafe28.com';

-- ¿Qué deberías ver?
-- ✅ El admin con su school_id y el nombre "Jean LeBouch"
-- ❌ Si school_id es NULL, hay que asignarlo


-- ========================================
-- PASO 2: Verificar estudiantes en la sede
-- ========================================
-- EJECUTA ESTA SEGUNDA:

SELECT 
  COUNT(*) as total_estudiantes,
  s.school_id,
  sc.name as nombre_sede
FROM students s
INNER JOIN schools sc ON sc.id = s.school_id
WHERE s.school_id = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
GROUP BY s.school_id, sc.name;

-- ¿Qué deberías ver?
-- ✅ Un número mayor a 0 de estudiantes
-- ❌ Si sale 0, no hay estudiantes en esa sede


-- ========================================
-- PASO 3: Verificar cuántos parent_ids únicos hay
-- ========================================
-- EJECUTA ESTA TERCERA:

SELECT 
  COUNT(DISTINCT s.parent_id) as total_parent_ids,
  s.school_id,
  sc.name as nombre_sede
FROM students s
INNER JOIN schools sc ON sc.id = s.school_id
WHERE s.school_id = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
  AND s.parent_id IS NOT NULL
GROUP BY s.school_id, sc.name;

-- ¿Qué deberías ver?
-- ✅ Un número mayor a 0 de parent_ids
-- ❌ Si sale 0, los estudiantes no tienen parent_id asignado


-- ========================================
-- PASO 4: Ver los parent_profiles que deberían aparecer
-- ========================================
-- EJECUTA ESTA CUARTA:

SELECT 
  pp.id,
  pp.full_name,
  pp.dni,
  pp.user_id,
  pp.school_id as parent_school_id
FROM parent_profiles pp
WHERE pp.user_id IN (
  SELECT DISTINCT s.parent_id
  FROM students s
  WHERE s.school_id = (
    SELECT school_id 
    FROM profiles 
    WHERE email = 'adminjbl@limacafe28.com'
  )
  AND s.parent_id IS NOT NULL
)
ORDER BY pp.full_name
LIMIT 10;

-- ¿Qué deberías ver?
-- ✅ Lista de padres con sus nombres y DNI
-- ❌ Si no aparece nada, hay un problema con parent_profiles


-- ========================================
-- PASO 5: Ver los teacher_profiles que deberían aparecer
-- ========================================
-- EJECUTA ESTA QUINTA:

SELECT 
  tp.id,
  tp.full_name,
  tp.dni,
  tp.school_id_1,
  s1.name as sede_1,
  tp.school_id_2,
  s2.name as sede_2
FROM teacher_profiles tp
LEFT JOIN schools s1 ON s1.id = tp.school_id_1
LEFT JOIN schools s2 ON s2.id = tp.school_id_2
WHERE tp.school_id_1 = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
OR tp.school_id_2 = (
  SELECT school_id 
  FROM profiles 
  WHERE email = 'adminjbl@limacafe28.com'
)
ORDER BY tp.full_name;

-- ¿Qué deberías ver?
-- ✅ Lista de profesores (incluyendo profesorjbl@limacafe28.com)
-- ❌ Si no aparece nada, los profesores no tienen school_id_1 configurado


-- ========================================
-- PASO 6: Prueba directa como si fuera el frontend
-- ========================================
-- EJECUTA ESTA SEXTA (esta simula lo que hace el frontend):

-- Primero obtener el school_id
SELECT school_id FROM profiles WHERE email = 'adminjbl@limacafe28.com';

-- Reemplaza 'SCHOOL_ID_AQUI' con el resultado de arriba:
-- Luego ejecuta esto:

-- Ver padres (reemplaza el UUID):
SELECT parent_id FROM students WHERE school_id = 'SCHOOL_ID_AQUI' LIMIT 5;

-- Ver profesores (reemplaza el UUID):
SELECT * FROM teacher_profiles 
WHERE school_id_1 = 'SCHOOL_ID_AQUI' OR school_id_2 = 'SCHOOL_ID_AQUI';


-- ========================================
-- RESUMEN
-- ========================================

/*
EJECUTA CADA PASO UNO POR UNO y compárteme los resultados.
Con eso sabré exactamente dónde está el problema.
*/
