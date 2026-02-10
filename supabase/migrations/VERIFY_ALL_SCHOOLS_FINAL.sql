-- =====================================================
-- VERIFICACIÓN COMPLETA DE TODAS LAS SEDES
-- =====================================================

-- 1️⃣ VERIFICAR: Profesores con transacciones duplicadas
SELECT 
  '🚨 PROFESORES CON TRANSACCIONES DUPLICADAS' as verificacion,
  COUNT(*) as total_profesores_afectados,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PERFECTO - Sin duplicados'
    ELSE '❌ HAY DUPLICADOS - Revisar detalles abajo'
  END as estado
FROM (
  SELECT 
    tp.full_name,
    t.description,
    COUNT(*) as cantidad
  FROM transactions t
  JOIN teacher_profiles tp ON t.teacher_id = tp.id
  WHERE 
    t.type = 'purchase'
    AND t.amount < 0
    AND DATE(t.created_at) >= '2026-02-08'
    AND t.description ILIKE '%almuerzo%'
  GROUP BY tp.full_name, t.description
  HAVING COUNT(*) > 1
) duplicados;

-- 2️⃣ DETALLE: Profesores con duplicados (si existen)
SELECT 
  '⚠️ DETALLE DE DUPLICADOS' as tipo,
  tp.full_name as profesor,
  t.description,
  COUNT(*) as cantidad_duplicadas,
  STRING_AGG(TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS'), ' | ') as fechas_creacion
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE 
  t.type = 'purchase'
  AND t.amount < 0
  AND DATE(t.created_at) >= '2026-02-08'
  AND t.description ILIKE '%almuerzo%'
GROUP BY tp.full_name, t.description
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicadas DESC, tp.full_name
LIMIT 10;

-- 3️⃣ VERIFICAR: Transacciones con payment_status incorrecto
SELECT 
  '🚨 TRANSACCIONES MARCADAS COMO PAID (ERROR)' as verificacion,
  COUNT(*) as total_incorrectas,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PERFECTO - Todas pending'
    ELSE '❌ HAY INCORRECTAS - Revisar detalles'
  END as estado
FROM transactions t
WHERE 
  t.teacher_id IS NOT NULL
  AND t.type = 'purchase'
  AND t.amount < 0
  AND t.payment_status = 'paid'
  AND t.payment_method IS NULL
  AND DATE(t.created_at) >= '2026-02-08';

-- 4️⃣ DETALLE: Transacciones marcadas como paid incorrectamente
SELECT 
  '⚠️ TRANSACCIONES CON PAYMENT_STATUS INCORRECTO' as tipo,
  tp.full_name as profesor,
  s.name as sede,
  t.description,
  t.amount,
  t.payment_status,
  t.payment_method,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
JOIN schools s ON t.school_id = s.id
WHERE 
  t.type = 'purchase'
  AND t.amount < 0
  AND t.payment_status = 'paid'
  AND t.payment_method IS NULL
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY s.name, tp.full_name
LIMIT 10;

-- 5️⃣ RESUMEN: Estado por sede
SELECT 
  '📊 RESUMEN POR SEDE' as tipo,
  s.name as sede,
  COUNT(DISTINCT tp.id) as total_profesores,
  COUNT(t.id) as total_transacciones,
  SUM(CASE WHEN t.payment_status = 'pending' THEN 1 ELSE 0 END) as transacciones_pending,
  SUM(CASE WHEN t.payment_status = 'paid' THEN 1 ELSE 0 END) as transacciones_paid,
  CASE 
    WHEN SUM(CASE WHEN t.payment_status = 'paid' AND t.payment_method IS NULL THEN 1 ELSE 0 END) > 0 
    THEN '⚠️ Hay paid incorrectos'
    ELSE '✅ Todo correcto'
  END as estado
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
JOIN schools s ON t.school_id = s.id
WHERE 
  t.type = 'purchase'
  AND t.amount < 0
  AND DATE(t.created_at) >= '2026-02-08'
  AND t.description ILIKE '%almuerzo%'
GROUP BY s.name
ORDER BY s.name;

-- 6️⃣ VERIFICAR: Transacciones sin school_id (problema)
SELECT 
  '🚨 TRANSACCIONES SIN SCHOOL_ID' as verificacion,
  COUNT(*) as total_sin_school,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PERFECTO'
    ELSE '⚠️ Hay transacciones sin sede'
  END as estado
FROM transactions t
WHERE 
  t.teacher_id IS NOT NULL
  AND t.type = 'purchase'
  AND t.amount < 0
  AND t.school_id IS NULL
  AND DATE(t.created_at) >= '2026-02-08';

-- 7️⃣ VERIFICACIÓN FINAL: Todo está correcto
SELECT 
  '✅ VERIFICACIÓN FINAL' as resultado,
  CASE 
    WHEN (
      -- No hay duplicados
      (SELECT COUNT(*) FROM (
        SELECT tp.full_name, t.description
        FROM transactions t
        JOIN teacher_profiles tp ON t.teacher_id = tp.id
        WHERE t.type = 'purchase' AND t.amount < 0 
        AND DATE(t.created_at) >= '2026-02-08'
        AND t.description ILIKE '%almuerzo%'
        GROUP BY tp.full_name, t.description
        HAVING COUNT(*) > 1
      ) d) = 0
      AND
      -- No hay paid incorrectos
      (SELECT COUNT(*) FROM transactions 
       WHERE teacher_id IS NOT NULL AND type = 'purchase' 
       AND amount < 0 AND payment_status = 'paid' 
       AND payment_method IS NULL 
       AND DATE(created_at) >= '2026-02-08') = 0
    ) THEN '🎉 TODO PERFECTO - Sistema funcionando correctamente'
    ELSE '⚠️ HAY PROBLEMAS - Revisar detalles arriba'
  END as estado_sistema;
