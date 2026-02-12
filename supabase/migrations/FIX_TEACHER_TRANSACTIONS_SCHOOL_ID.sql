-- ============================================================
-- FIX: Reparar transacciones de profesores con school_id NULL
-- ============================================================
-- PROBLEMA: En POS.tsx se usaba selectedTeacher.school_id_1 pero
-- la vista teacher_profiles_with_schools devuelve school_1_id.
-- Resultado: Todas las compras de profesores se guardaron con school_id = NULL.
-- ============================================================

-- PASO 1: Verificar cuántas transacciones están afectadas
SELECT 
    t.id,
    t.description,
    t.teacher_id,
    t.school_id AS school_id_actual,
    tp.school_id_1 AS school_id_correcto,
    tp.full_name AS profesor,
    t.created_at,
    t.amount
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.teacher_id IS NOT NULL
  AND t.school_id IS NULL
  AND t.type = 'purchase'
ORDER BY t.created_at DESC;

-- PASO 2: Reparar - Actualizar school_id usando el school_id_1 del profesor
UPDATE transactions t
SET school_id = tp.school_id_1
FROM teacher_profiles tp
WHERE t.teacher_id = tp.id
  AND t.teacher_id IS NOT NULL
  AND t.school_id IS NULL
  AND t.type = 'purchase'
  AND tp.school_id_1 IS NOT NULL;

-- PASO 3: También reparar la tabla sales
UPDATE sales s
SET school_id = tp.school_id_1
FROM teacher_profiles tp
WHERE s.teacher_id = tp.id
  AND s.teacher_id IS NOT NULL
  AND s.school_id IS NULL
  AND tp.school_id_1 IS NOT NULL;

-- PASO 4: Verificar que se corrigió
SELECT 
    t.id,
    t.description,
    t.school_id,
    s.name AS sede,
    tp.full_name AS profesor
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.teacher_id IS NOT NULL
  AND t.type = 'purchase'
ORDER BY t.created_at DESC;
