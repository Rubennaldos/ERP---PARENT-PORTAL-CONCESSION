-- =====================================================
-- VERIFICAR TRANSACCIONES MANUALES EN "PAGOS REALIZADOS"
-- =====================================================

-- 1️⃣ Ver transacciones manuales pagadas (últimas 20)
SELECT 
  '🔍 TRANSACCIONES MANUALES PAGADAS' as tipo,
  id,
  created_at,
  description,
  amount,
  payment_status,
  payment_method,
  manual_client_name, -- ¿Tiene nombre?
  student_id, -- ¿Debería ser NULL?
  teacher_id, -- ¿Debería ser NULL?
  school_id,
  CASE 
    WHEN manual_client_name IS NULL OR manual_client_name = '' THEN '⚠️ SIN NOMBRE'
    ELSE '✅ Tiene nombre'
  END as estado_nombre
FROM transactions
WHERE payment_status = 'paid'
  AND student_id IS NULL
  AND teacher_id IS NULL
  AND type = 'purchase'
ORDER BY created_at DESC
LIMIT 20;

-- 2️⃣ Contar cuántas transacciones manuales NO tienen nombre
SELECT 
  '📊 RESUMEN TRANSACCIONES MANUALES' as tipo,
  COUNT(*) as total_manuales,
  COUNT(CASE WHEN manual_client_name IS NULL OR manual_client_name = '' THEN 1 END) as sin_nombre,
  COUNT(CASE WHEN manual_client_name IS NOT NULL AND manual_client_name != '' THEN 1 END) as con_nombre
FROM transactions
WHERE payment_status = 'paid'
  AND student_id IS NULL
  AND teacher_id IS NULL
  AND type = 'purchase';

-- 3️⃣ Ver transacciones sin nombre (para identificar el problema)
SELECT 
  '⚠️ TRANSACCIONES SIN NOMBRE' as tipo,
  id,
  created_at,
  description,
  amount,
  payment_method,
  school_id
FROM transactions
WHERE payment_status = 'paid'
  AND student_id IS NULL
  AND teacher_id IS NULL
  AND type = 'purchase'
  AND (manual_client_name IS NULL OR manual_client_name = '')
ORDER BY created_at DESC
LIMIT 10;
