-- ══════════════════════════════════════════════════════════════════════
-- FIX: Compras pendientes de estudiantes que debían estar en modo Recarga
-- ══════════════════════════════════════════════════════════════════════
--
-- Problema: Los niños tenían saldo (modo Recarga) pero el sistema los
-- trataba como Cuenta Libre. Sus compras quedaron como payment_status='pending'
-- (deuda) en vez de descontarse del saldo.
--
-- Este script:
--   PASO 1: Ver cuánto consumieron en compras pendientes (diagnóstico)
--   PASO 2: Descontar esas compras del saldo actual y marcarlas como 'paid'
--
-- IMPORTANTE: Solo afecta estudiantes con free_account=false (modo Recarga)
-- ══════════════════════════════════════════════════════════════════════

-- ── PASO 1: Diagnóstico — ver compras pendientes de alumnos en modo Recarga ──
SELECT
  s.full_name                          AS alumno,
  s.balance                            AS saldo_actual,
  COUNT(t.id)                          AS compras_pendientes,
  ABS(SUM(t.amount))                   AS total_consumido,
  s.balance - ABS(SUM(t.amount))       AS saldo_real_restante
FROM public.students s
JOIN public.transactions t ON t.student_id = s.id
WHERE s.free_account = false
  AND t.type = 'purchase'
  AND t.payment_status = 'pending'
  AND t.created_at >= (
      -- Solo desde la fecha en que se les recargó (primera recarga)
      SELECT MIN(r.created_at)
      FROM public.transactions r
      WHERE r.student_id = s.id AND r.type = 'recharge'
  )
GROUP BY s.id, s.full_name, s.balance
ORDER BY s.full_name;


-- ── PASO 2: Aplicar corrección (descomentar para ejecutar) ──
-- Descuenta las compras pendientes del saldo y las marca como pagadas

-- DO $fix$
-- DECLARE
--   rec RECORD;
--   v_total_pending NUMERIC;
-- BEGIN
--   FOR rec IN
--     SELECT s.id AS student_id, s.balance, ABS(SUM(t.amount)) AS total_pending
--     FROM public.students s
--     JOIN public.transactions t ON t.student_id = s.id
--     WHERE s.free_account = false
--       AND t.type = 'purchase'
--       AND t.payment_status = 'pending'
--       AND t.created_at >= (
--           SELECT MIN(r.created_at)
--           FROM public.transactions r
--           WHERE r.student_id = s.id AND r.type = 'recharge'
--       )
--     GROUP BY s.id, s.balance
--   LOOP
--     -- Marcar compras como pagadas
--     UPDATE public.transactions
--     SET payment_status = 'paid'
--     WHERE student_id = rec.student_id
--       AND type = 'purchase'
--       AND payment_status = 'pending';
--
--     -- Descontar del saldo actual
--     UPDATE public.students
--     SET balance = GREATEST(0, balance - rec.total_pending)
--     WHERE id = rec.student_id;
--
--     RAISE NOTICE 'Corregido: % — consumido S/ % — saldo nuevo: S/ %',
--       rec.student_id, rec.total_pending,
--       GREATEST(0, rec.balance - rec.total_pending);
--   END LOOP;
-- END;
-- $fix$;
