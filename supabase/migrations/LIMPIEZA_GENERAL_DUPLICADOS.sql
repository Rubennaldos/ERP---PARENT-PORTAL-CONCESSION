-- =====================================================
-- LIMPIEZA GENERAL: ELIMINAR DUPLICADOS Y ARREGLAR ESTADOS
-- =====================================================

-- PASO 1: Ver el problema actual - Transacciones pending que ya están pagadas
SELECT 
    '🔴 PROBLEMA: Transacciones PENDING con duplicados PAID' as titulo,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    t.description,
    COUNT(*) as total_transacciones,
    SUM(CASE WHEN t.payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN t.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
    ARRAY_AGG(t.id) as transaction_ids,
    ARRAY_AGG(t.payment_status) as statuses
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.description ILIKE '%Almuerzo%'
  AND t.created_at >= '2026-02-01'
GROUP BY cliente, t.description
HAVING COUNT(*) > 1  -- Solo mostrar los que tienen múltiples transacciones
ORDER BY cliente, t.description;

-- PASO 2: SOLUCIÓN - Para cada grupo de duplicados, mantener solo el PAID más reciente
-- y ELIMINAR todos los PENDING y los PAID duplicados antiguos

-- 2a. Identificar qué eliminar
WITH ranked_transactions AS (
  SELECT 
    t.id,
    t.created_at,
    t.payment_status,
    t.payment_method,
    t.description,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(t.student_id::text, t.teacher_id::text, t.manual_client_name),
        DATE(t.created_at),
        t.description
      ORDER BY 
        CASE WHEN t.payment_status = 'paid' THEN 0 ELSE 1 END,  -- Priorizar paid
        t.created_at DESC  -- Más reciente primero
    ) as row_num
  FROM public.transactions t
  LEFT JOIN public.students s ON t.student_id = s.id
  LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
  WHERE t.type = 'purchase'
    AND t.description ILIKE '%Almuerzo%'
    AND t.created_at >= '2026-02-01'
)
SELECT 
  '📋 PLAN DE LIMPIEZA' as titulo,
  id,
  created_at,
  payment_status,
  payment_method,
  cliente,
  description,
  CASE 
    WHEN row_num = 1 THEN '✅ MANTENER (más reciente y/o pagado)'
    ELSE '❌ ELIMINAR (duplicado)'
  END as accion
FROM ranked_transactions
ORDER BY cliente, description, row_num;

-- PASO 3: EJECUTAR LA LIMPIEZA
-- ⚠️ Esto eliminará todas las transacciones duplicadas
-- Mantiene solo la más reciente de cada grupo (preferiblemente la pagada)

DELETE FROM public.transactions
WHERE id IN (
  WITH ranked_transactions AS (
    SELECT 
      t.id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          COALESCE(t.student_id::text, t.teacher_id::text, t.manual_client_name),
          DATE(t.created_at),
          t.description
        ORDER BY 
          CASE WHEN t.payment_status = 'paid' THEN 0 ELSE 1 END,
          t.created_at DESC
      ) as row_num
    FROM public.transactions t
    WHERE t.type = 'purchase'
      AND t.description ILIKE '%Almuerzo%'
      AND t.created_at >= '2026-02-01'
  )
  SELECT id 
  FROM ranked_transactions 
  WHERE row_num > 1  -- Eliminar todos excepto el primero de cada grupo
);

-- PASO 4: Verificar resultado
SELECT 
    '✅ DESPUÉS DE LIMPIEZA' as titulo,
    COALESCE(s.full_name, tp.full_name, t.manual_client_name) as cliente,
    t.description,
    COUNT(*) as transacciones_restantes,
    ARRAY_AGG(t.payment_status) as estados
FROM public.transactions t
LEFT JOIN public.students s ON t.student_id = s.id
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE t.type = 'purchase'
  AND t.description ILIKE '%Almuerzo%'
  AND t.created_at >= '2026-02-01'
GROUP BY cliente, t.description
ORDER BY cliente, t.description;

-- PASO 5: Ver cuántas transacciones pending quedan en total
SELECT 
    '🔍 TRANSACCIONES PENDING RESTANTES' as titulo,
    COUNT(*) as total_pending
FROM public.transactions
WHERE type = 'purchase'
  AND payment_status IN ('pending', 'partial')
  AND created_at >= '2026-02-01';
