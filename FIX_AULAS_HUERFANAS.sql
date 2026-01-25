-- =====================================================
-- FIX: Reparar aulas huérfanas (orphan classrooms)
-- =====================================================
-- Problema: Las aulas tienen level_id que ya no existe
-- Solución: Vincular las aulas al grado correcto por nombre
-- =====================================================

-- PASO 1: Ver el problema - Aulas sin grado válido
SELECT 
  sc.id as aula_id,
  sc.name as aula_nombre,
  sc.level_id as level_id_actual,
  sc.school_id,
  sl.name as grado_existe
FROM school_classrooms sc
LEFT JOIN school_levels sl ON sc.level_id = sl.id
WHERE sc.is_active = true
ORDER BY sc.school_id, sc.name;

-- Si "grado_existe" es NULL, significa que el aula está huérfana

-- =====================================================
-- PASO 2: SOLUCIÓN AUTOMÁTICA
-- Vincular aulas al grado correcto basándose en la sede
-- =====================================================

-- Para Little Saint George: Vincular "geoge" al grado "little"
UPDATE school_classrooms
SET level_id = (
  SELECT id 
  FROM school_levels 
  WHERE name = 'little' 
  AND school_id = school_classrooms.school_id
  LIMIT 1
)
WHERE name = 'geoge'
AND school_id = (SELECT id FROM schools WHERE name = 'Little Saint George' LIMIT 1);

-- =====================================================
-- PASO 3: SOLUCIÓN GENERAL
-- Para todas las aulas huérfanas en todas las sedes
-- =====================================================

-- Esto vincula automáticamente las aulas al PRIMER grado disponible
-- de su sede si no tienen un level_id válido
UPDATE school_classrooms sc
SET level_id = (
  SELECT sl.id
  FROM school_levels sl
  WHERE sl.school_id = sc.school_id
  AND sl.is_active = true
  ORDER BY sl.order_index
  LIMIT 1
)
WHERE sc.is_active = true
AND NOT EXISTS (
  SELECT 1 
  FROM school_levels sl2 
  WHERE sl2.id = sc.level_id 
  AND sl2.is_active = true
);

-- =====================================================
-- PASO 4: Verificar que se arreglaron
-- =====================================================

SELECT 
  sc.id as aula_id,
  sc.name as aula_nombre,
  sl.name as grado_vinculado,
  s.name as sede
FROM school_classrooms sc
INNER JOIN school_levels sl ON sc.level_id = sl.id
INNER JOIN schools s ON sc.school_id = s.id
WHERE sc.is_active = true
ORDER BY s.name, sl.name, sc.name;

-- Deberías ver todas las aulas correctamente vinculadas

-- =====================================================
-- ALTERNATIVA: Eliminar aulas huérfanas
-- (Si prefieres empezar de cero)
-- =====================================================

/*
-- CUIDADO: Esto borra las aulas que no tienen grado válido
DELETE FROM school_classrooms
WHERE NOT EXISTS (
  SELECT 1 
  FROM school_levels sl 
  WHERE sl.id = school_classrooms.level_id 
  AND sl.is_active = true
);
*/

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Después de ejecutar este script, todas tus aulas
-- deberían aparecer correctamente en el modal de
-- "Agregar Hijo/a" cuando selecciones el grado.
-- =====================================================
