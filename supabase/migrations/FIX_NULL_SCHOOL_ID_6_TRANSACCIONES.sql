-- ============================================================
-- FIX: Asignar school_id a 6 transacciones huérfanas
-- ============================================================
-- RESULTADO DE LA INVESTIGACIÓN:
-- - 4 son compras POS a crédito de profesores (pendientes)
-- - 1 es una compra POS de cliente genérico (pagada)
-- - 1 es de pruebas (ya cancelada - no importa)
-- - NINGUNA es un duplicado anulado previamente
-- - Todas tienen cajero con sede identificable
-- ============================================================

-- PASO 1: VER QUE VAMOS A CAMBIAR (preview antes de ejecutar)
SELECT 
  t.id,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  t.school_id AS school_id_actual,
  p.school_id AS school_id_correcto,
  cs.name AS sede_correcta
FROM transactions t
JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools cs ON p.school_id = cs.id
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND p.school_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 100


-- PASO 2: EJECUTAR EL FIX
-- Asigna el school_id del cajero que creó la transacción
UPDATE transactions t
SET school_id = p.school_id
FROM profiles p
WHERE t.created_by = p.id
  AND t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND p.school_id IS NOT NULL


-- PASO 3: VERIFICAR QUE YA NO HAY TRANSACCIONES SIN SEDE
SELECT 
  t.id,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  t.school_id,
  s.name AS sede
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.school_id IS NULL
  AND t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
ORDER BY t.created_at DESC
LIMIT 100
