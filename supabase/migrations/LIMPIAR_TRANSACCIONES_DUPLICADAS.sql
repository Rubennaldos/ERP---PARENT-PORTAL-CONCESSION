-- =====================================================
-- LIMPIAR TRANSACCIONES DUPLICADAS DE PROFESORJBL
-- =====================================================
-- Este script elimina transacciones duplicadas y deja solo 1
-- =====================================================

-- PASO 1: Ver el estado actual antes de limpiar
SELECT 
    'ANTES DE LIMPIAR' as momento,
    tp.full_name,
    t.description,
    COUNT(*) as cantidad_transacciones,
    SUM(ABS(t.amount)) as monto_total
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
  AND t.description ILIKE '%Almuerzo - 1 de febrero%'
GROUP BY tp.full_name, t.description;

-- PASO 2: Identificar las transacciones duplicadas (las 3 más antiguas)
-- Vamos a ELIMINAR estas 3 y dejar solo la más reciente (con operation_number = '1111')
WITH transacciones_a_eliminar AS (
  SELECT 
    t.id,
    t.created_at,
    t.payment_method,
    t.operation_number,
    ROW_NUMBER() OVER (
      PARTITION BY t.teacher_id, t.description, DATE(t.created_at)
      ORDER BY t.created_at DESC
    ) as row_num
  FROM public.transactions t
  LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
  WHERE tp.full_name = 'profesorjbl'
    AND t.description ILIKE '%Almuerzo - 1 de febrero%'
)
SELECT 
  id,
  created_at,
  payment_method,
  operation_number,
  CASE 
    WHEN row_num = 1 THEN '✅ MANTENER (más reciente)'
    ELSE '❌ ELIMINAR (duplicado)'
  END as accion
FROM transacciones_a_eliminar
ORDER BY created_at DESC;

-- PASO 3: ELIMINAR las transacciones duplicadas (solo las 3 más antiguas)
-- ⚠️ EJECUTA ESTO SOLO SI ESTÁS SEGURO
/*
DELETE FROM public.transactions
WHERE id IN (
  SELECT id FROM (
    SELECT 
      t.id,
      ROW_NUMBER() OVER (
        PARTITION BY t.teacher_id, t.description, DATE(t.created_at)
        ORDER BY t.created_at DESC
      ) as row_num
    FROM public.transactions t
    LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
    WHERE tp.full_name = 'profesorjbl'
      AND t.description ILIKE '%Almuerzo - 1 de febrero%'
  ) sub
  WHERE row_num > 1  -- Eliminar todo excepto el más reciente
);
*/

-- PASO 4: Verificar después de limpiar
SELECT 
    'DESPUÉS DE LIMPIAR' as momento,
    tp.full_name,
    t.description,
    COUNT(*) as cantidad_transacciones,
    SUM(ABS(t.amount)) as monto_total
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
  AND t.description ILIKE '%Almuerzo - 1 de febrero%'
GROUP BY tp.full_name, t.description;

-- PASO 5: Ver TODAS las transacciones pendientes de profesorjbl
SELECT 
    t.id,
    t.created_at,
    t.amount,
    t.payment_status,
    t.description,
    t.metadata
FROM public.transactions t
LEFT JOIN public.teacher_profiles tp ON t.teacher_id = tp.id
WHERE tp.full_name = 'profesorjbl'
  AND t.payment_status IN ('pending', 'partial')
ORDER BY t.created_at DESC;
