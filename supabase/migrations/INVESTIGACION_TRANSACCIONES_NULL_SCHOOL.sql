-- ============================================================
-- 🔍 INVESTIGACIÓN PROFUNDA: Transacciones con school_id NULL
-- ============================================================
-- OBJETIVO: Entender QUÉ son estas transacciones antes de tocar nada
-- ¿Son duplicados ya anulados? ¿Ventas a crédito? ¿Ventas normales?
-- ⚠️ EJECUTAR CADA PASO POR SEPARADO en Supabase SQL Editor
-- ============================================================


-- ============================================================
-- PASO 1: VER CADA TRANSACCIÓN CON school_id = NULL EN DETALLE
-- ============================================================
SELECT 
  t.id,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  t.payment_method,
  t.type,
  t.created_at,
  CASE 
    WHEN t.teacher_id IS NOT NULL THEN 'PROFESOR'
    WHEN t.student_id IS NOT NULL THEN 'ESTUDIANTE'
    WHEN t.manual_client_name IS NOT NULL THEN 'CLIENTE MANUAL'
    ELSE 'SIN ASIGNAR'
  END AS tipo_cliente,
  COALESCE(tp.full_name, st.full_name, t.manual_client_name, '---') AS nombre_cliente,
  t.teacher_id,
  t.student_id,
  t.manual_client_name,
  t.created_by,
  p.email AS cajero_email,
  p.full_name AS cajero_nombre,
  p.school_id AS cajero_school_id,
  cs.name AS sede_del_cajero,
  CASE 
    WHEN t.description ILIKE '%almuerzo%' THEN 'SI - ALMUERZO'
    WHEN t.metadata->>'lunch_order_id' IS NOT NULL THEN 'SI - ALMUERZO (metadata)'
    ELSE 'NO - VENTA POS'
  END AS es_almuerzo,
  t.metadata::text AS metadata_completa,
  CASE 
    WHEN t.metadata->>'cancelled_reason' IS NOT NULL THEN 'SI: ' || (t.metadata->>'cancelled_reason')
    WHEN t.metadata->>'cancellation_reason' IS NOT NULL THEN 'SI: ' || (t.metadata->>'cancellation_reason')
    ELSE '---'
  END AS razon_cancelacion_metadata
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN students st ON t.student_id = st.id
LEFT JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools cs ON p.school_id = cs.id
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
ORDER BY t.created_at DESC
LIMIT 500


-- ============================================================
-- PASO 2: RESUMEN - CUANTAS SON CANCELADAS vs PENDIENTES vs PAGADAS
-- ============================================================
SELECT 
  t.payment_status,
  COUNT(*) AS cantidad,
  SUM(ABS(t.amount)) AS monto_total,
  STRING_AGG(t.ticket_code, ', ' ORDER BY t.created_at) AS tickets
FROM transactions t
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
GROUP BY t.payment_status
ORDER BY t.payment_status
LIMIT 100


-- ============================================================
-- PASO 3: ALGUNA ES UN DUPLICADO PREVIAMENTE CANCELADO?
-- Buscar cancelled_reason = 'duplicate_cleanup' o similar en metadata
-- ============================================================
SELECT 
  t.id,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  t.metadata->>'cancelled_reason' AS cancelled_reason,
  t.metadata->>'cancellation_reason' AS cancellation_reason,
  t.metadata->>'kept_transaction_id' AS tx_original_conservada,
  t.created_at
FROM transactions t
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND (
    t.payment_status = 'cancelled'
    OR t.metadata->>'cancelled_reason' IS NOT NULL
    OR t.metadata->>'cancellation_reason' IS NOT NULL
  )
ORDER BY t.created_at DESC
LIMIT 500


-- ============================================================
-- PASO 4: PARA LAS NO-CANCELADAS, EXISTE OTRA TRANSACCION
-- IGUAL PARA EL MISMO PROFESOR/ESTUDIANTE EL MISMO DIA CON MISMO MONTO?
-- (para verificar si son duplicados que aun no se limpiaron)
-- ============================================================
SELECT 
  t.id AS tx_null_id,
  t.ticket_code AS tx_null_ticket,
  t.description AS tx_null_desc,
  t.amount AS tx_null_monto,
  t.payment_status AS tx_null_status,
  t.created_at AS tx_null_created,
  t2.id AS tx_posible_dup_id,
  t2.ticket_code AS tx_posible_dup_ticket,
  t2.description AS tx_posible_dup_desc,
  t2.amount AS tx_posible_dup_monto,
  t2.payment_status AS tx_posible_dup_status,
  t2.school_id AS tx_posible_dup_school_id,
  s.name AS tx_posible_dup_sede,
  t2.created_at AS tx_posible_dup_created
FROM transactions t
JOIN transactions t2 ON (
  (t.teacher_id IS NOT NULL AND t2.teacher_id = t.teacher_id)
  OR (t.student_id IS NOT NULL AND t2.student_id = t.student_id)
  OR (t.manual_client_name IS NOT NULL AND t2.manual_client_name = t.manual_client_name)
)
LEFT JOIN schools s ON t2.school_id = s.id
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND t.payment_status != 'cancelled'
  AND t2.id != t.id
  AND t2.type = 'purchase'
  AND DATE(t2.created_at AT TIME ZONE 'America/Lima') = DATE(t.created_at AT TIME ZONE 'America/Lima')
  AND t2.amount = t.amount
ORDER BY t.created_at DESC, t2.created_at DESC
LIMIT 500


-- ============================================================
-- PASO 5: DE QUE SEDE DEBERIAN SER? (basado en cajero o profesor)
-- Solo las NO canceladas
-- ============================================================
SELECT 
  t.id,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  CASE 
    WHEN p.school_id IS NOT NULL THEN cs.name
    ELSE 'Cajero sin sede'
  END AS sede_segun_cajero,
  p.school_id AS school_id_del_cajero,
  CASE 
    WHEN tp.school_id_1 IS NOT NULL THEN ts.name
    ELSE NULL
  END AS sede_segun_profesor,
  tp.school_id_1 AS school_id_del_profesor,
  CASE 
    WHEN p.school_id = tp.school_id_1 THEN 'COINCIDEN'
    WHEN tp.school_id_1 IS NULL THEN 'Profesor sin sede'
    WHEN p.school_id IS NULL THEN 'Cajero sin sede'
    ELSE 'DIFERENTES'
  END AS coincidencia_sedes
FROM transactions t
LEFT JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN schools ts ON tp.school_id_1 = ts.id
LEFT JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools cs ON p.school_id = cs.id
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND t.payment_status != 'cancelled'
ORDER BY t.created_at DESC
LIMIT 500


-- ============================================================
-- PASO 6: RESUMEN EJECUTIVO
-- ============================================================
SELECT concepto, cantidad FROM (
  SELECT 1 AS orden, 'TOTAL con school_id = NULL' AS concepto, COUNT(*) AS cantidad
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z'
  UNION ALL
  SELECT 2, 'Canceladas (ya anuladas)', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z' AND payment_status = 'cancelled'
  UNION ALL
  SELECT 3, 'Pendientes (deudas activas)', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z' AND payment_status = 'pending'
  UNION ALL
  SELECT 4, 'Pagadas', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z' AND payment_status = 'paid'
  UNION ALL
  SELECT 5, 'Son de PROFESORES', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z' AND teacher_id IS NOT NULL
  UNION ALL
  SELECT 6, 'Son de ESTUDIANTES', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z' AND student_id IS NOT NULL
  UNION ALL
  SELECT 7, 'Son ALMUERZOS', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z'
    AND (description ILIKE '%almuerzo%' OR metadata->>'lunch_order_id' IS NOT NULL)
  UNION ALL
  SELECT 8, 'Son COMPRAS POS', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z'
    AND description NOT ILIKE '%almuerzo%' AND (metadata IS NULL OR metadata->>'lunch_order_id' IS NULL)
  UNION ALL
  SELECT 9, 'Con metadata de cancelacion', COUNT(*)
  FROM transactions WHERE school_id IS NULL AND type = 'purchase' AND created_at >= '2026-02-01T00:00:00Z'
    AND (metadata->>'cancelled_reason' IS NOT NULL OR metadata->>'cancellation_reason' IS NOT NULL)
) sub
ORDER BY orden
LIMIT 100
