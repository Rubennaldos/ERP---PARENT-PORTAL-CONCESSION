-- =====================================================
-- ENCONTRAR Y ELIMINAR DUPLICADOS DEL MISMO DÍA
-- =====================================================

-- PASO 1: Buscar profesores con transacciones duplicadas del MISMO día
SELECT 
  '🚨 PROFESORES CON DUPLICADOS DEL MISMO DÍA' as problema,
  tp.full_name as profesor,
  t.description,
  COUNT(*) as cantidad_duplicadas,
  STRING_AGG(t.id::TEXT, ', ') as transaction_ids,
  STRING_AGG(TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS'), ' | ') as fechas_creacion
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE 
  t.type = 'purchase'
  AND t.amount < 0
  AND DATE(t.created_at) >= '2026-02-08'
  AND t.description ILIKE 'Almuerzo%'
GROUP BY tp.full_name, t.description
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicadas DESC, tp.full_name;

-- PASO 2: Ver detalles de Damaris específicamente
SELECT 
  '🔍 DAMARIS - Detalle de transacciones' as tipo,
  t.id,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  COALESCE(p.full_name, '🤖 SISTEMA') as creado_por,
  t.created_by
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE tp.full_name ILIKE '%Damaris%'
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY t.created_at;

-- PASO 3: Identificar cuál es la transacción correcta (con created_by) y cuál la duplicada
WITH duplicates AS (
  SELECT 
    tp.full_name,
    t.description,
    t.id,
    t.created_at,
    t.created_by,
    ROW_NUMBER() OVER (
      PARTITION BY t.teacher_id, t.description 
      ORDER BY 
        CASE WHEN t.created_by IS NOT NULL THEN 0 ELSE 1 END,  -- Priorizar las que tienen created_by
        t.created_at  -- Luego por fecha
    ) as row_num
  FROM transactions t
  JOIN teacher_profiles tp ON t.teacher_id = tp.id
  WHERE 
    t.type = 'purchase'
    AND t.amount < 0
    AND DATE(t.created_at) >= '2026-02-08'
    AND t.description ILIKE 'Almuerzo%'
)
SELECT 
  '⚠️ TRANSACCIONES A ELIMINAR (duplicadas)' as tipo,
  full_name as profesor,
  description,
  id,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  CASE WHEN created_by IS NULL THEN '🤖 SISTEMA' ELSE 'Usuario' END as origen
FROM duplicates
WHERE row_num > 1  -- Todas excepto la primera (correcta)
ORDER BY full_name;

-- PASO 4: ELIMINAR las transacciones duplicadas (mantener solo la primera)
WITH duplicates AS (
  SELECT 
    t.id,
    ROW_NUMBER() OVER (
      PARTITION BY t.teacher_id, t.description 
      ORDER BY 
        CASE WHEN t.created_by IS NOT NULL THEN 0 ELSE 1 END,
        t.created_at
    ) as row_num
  FROM transactions t
  WHERE 
    t.type = 'purchase'
    AND t.amount < 0
    AND DATE(t.created_at) >= '2026-02-08'
    AND t.description ILIKE 'Almuerzo%'
    AND t.teacher_id IS NOT NULL
)
DELETE FROM transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- PASO 5: Verificar resultado final de Damaris
SELECT 
  '✅ DAMARIS - Estado Final' as resultado,
  t.id,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name ILIKE '%Damaris%'
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY t.created_at;

-- PASO 6: Verificar que NO queden duplicados
SELECT 
  '📊 VERIFICACIÓN - ¿Quedan duplicados?' as verificacion,
  tp.full_name as profesor,
  t.description,
  COUNT(*) as cantidad
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE 
  t.type = 'purchase'
  AND t.amount < 0
  AND DATE(t.created_at) >= '2026-02-08'
  AND t.description ILIKE 'Almuerzo%'
GROUP BY tp.full_name, t.description
HAVING COUNT(*) > 1;
