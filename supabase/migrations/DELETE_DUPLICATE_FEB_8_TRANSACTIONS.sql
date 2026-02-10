-- =====================================================
-- ELIMINAR TRANSACCIONES DUPLICADAS DEL "8 DE FEBRERO"
-- =====================================================

-- PASO 1: Ver cuántas transacciones se van a eliminar
SELECT 
  '🔍 VISTA PREVIA - Transacciones a eliminar' as paso,
  COUNT(*) as total_a_eliminar,
  SUM(CASE WHEN created_by IS NULL THEN 1 ELSE 0 END) as sin_creador,
  SUM(CASE WHEN created_by IS NOT NULL THEN 1 ELSE 0 END) as con_creador
FROM transactions
WHERE description ILIKE '%8 de febrero%'
  AND DATE(created_at) = '2026-02-09'
  AND type = 'purchase'
  AND amount < 0;

-- PASO 2: Ver detalles de las que tienen created_by (por si acaso)
SELECT 
  '⚠️ VERIFICAR - Transacciones con creador que serán eliminadas' as alerta,
  t.id,
  tp.full_name as profesor,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  p.full_name as creado_por
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE description ILIKE '%8 de febrero%'
  AND DATE(t.created_at) = '2026-02-09'
  AND t.type = 'purchase'
  AND t.amount < 0
  AND t.created_by IS NOT NULL;

-- PASO 3: ELIMINAR las transacciones duplicadas (solo si PASO 2 está OK)
-- ⚠️ COMENTAR ESTAS LÍNEAS SI NO ESTÁS SEGURO
DELETE FROM transactions
WHERE description ILIKE '%8 de febrero%'
  AND DATE(created_at) = '2026-02-09'
  AND type = 'purchase'
  AND amount < 0
  AND created_by IS NULL; -- Solo eliminar las que no tienen creador

-- PASO 4: Verificar que se eliminaron
SELECT 
  '✅ RESULTADO - Transacciones restantes del 8 de febrero' as resultado,
  COUNT(*) as total_restantes
FROM transactions
WHERE description ILIKE '%8 de febrero%'
  AND DATE(created_at) = '2026-02-09';

-- PASO 5: Ver transacciones correctas que quedan
SELECT 
  '✅ TRANSACCIONES CORRECTAS (9, 10, 11 de febrero)' as tipo,
  tp.full_name as profesor,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  COALESCE(p.full_name, '🤖 SISTEMA') as creado_por
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE DATE(t.created_at) = '2026-02-09'
  AND t.type = 'purchase'
  AND t.amount < 0
  AND t.teacher_id IS NOT NULL
ORDER BY tp.full_name, t.created_at
LIMIT 20;
