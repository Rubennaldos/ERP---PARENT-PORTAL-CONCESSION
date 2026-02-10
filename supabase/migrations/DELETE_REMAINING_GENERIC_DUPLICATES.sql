-- =====================================================
-- ELIMINAR TRANSACCIONES DUPLICADAS RESTANTES (GENÉRICAS)
-- =====================================================

-- PASO 1: Ver cuántas transacciones genéricas quedan
SELECT 
  '🔍 TRANSACCIONES GENÉRICAS RESTANTES' as paso,
  COUNT(*) as total
FROM transactions
WHERE 
  -- Buscar transacciones que NO tienen nombre de categoría
  description !~ 'Menú|Light|Opción|Profesores|Ligth|Compra'
  AND description ILIKE 'Almuerzo - %'
  AND type = 'purchase'
  AND amount < 0
  AND teacher_id IS NOT NULL
  AND DATE(created_at) >= '2026-02-08';

-- PASO 2: Ver ejemplos de las que quedan
SELECT 
  '⚠️ EJEMPLOS de transacciones genéricas restantes' as tipo,
  tp.full_name as profesor,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE 
  description !~ 'Menú|Light|Opción|Profesores|Ligth|Compra'
  AND description ILIKE 'Almuerzo - %'
  AND t.type = 'purchase'
  AND t.amount < 0
  AND t.teacher_id IS NOT NULL
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY tp.full_name
LIMIT 20;

-- PASO 3: ELIMINAR las transacciones genéricas restantes
DELETE FROM transactions
WHERE 
  -- Eliminar solo las que NO tienen nombre de categoría
  description !~ 'Menú|Light|Opción|Profesores|Ligth|Compra'
  AND description ILIKE 'Almuerzo - %'
  AND type = 'purchase'
  AND amount < 0
  AND teacher_id IS NOT NULL
  AND DATE(created_at) >= '2026-02-08';

-- PASO 4: Verificar Milagros específicamente
SELECT 
  '✅ MILAGROS - Estado Final' as resultado,
  t.id,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  t.payment_status
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name ILIKE '%Milagros%Vilca%'
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY t.created_at;

-- PASO 5: Ver resumen de TODOS los profesores afectados
SELECT 
  '📊 RESUMEN FINAL TODOS LOS PROFESORES' as tipo,
  tp.full_name as profesor,
  COUNT(*) as total_transacciones,
  STRING_AGG(SUBSTRING(t.description, 1, 50), ' | ') as descripciones
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE DATE(t.created_at) >= '2026-02-08'
  AND t.type = 'purchase'
  AND t.amount < 0
GROUP BY tp.full_name
HAVING COUNT(*) > 0
ORDER BY tp.full_name
LIMIT 20;
