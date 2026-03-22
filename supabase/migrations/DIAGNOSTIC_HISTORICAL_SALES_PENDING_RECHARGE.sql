-- ══════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO: Alumnos en Modo Recarga con deudas de ventas históricas
--
-- Este script identifica a todos los alumnos que:
--   1. Están en Modo Recarga (free_account = false)
--   2. Tienen transacciones de tipo 'purchase' con payment_status = 'pending'
--      generadas por ventas históricas (source = 'historical_kiosk_entry')
--
-- Estas son las filas mal registradas por el bug: deberían ser 'paid'
-- y el balance del alumno debería haber sido descontado.
-- ══════════════════════════════════════════════════════════════════════

-- ── PASO 1: Ver alumnos afectados ──────────────────────────────────────
SELECT
  s.id                                                      AS student_id,
  s.full_name                                               AS alumno,
  s.balance                                                 AS saldo_actual,
  s.free_account,
  COUNT(t.id)                                               AS compras_pendientes,
  SUM(ABS(t.amount))                                        AS total_deuda_historica,
  s.balance + SUM(ABS(t.amount))                            AS saldo_real_si_se_aplicaran
FROM public.students  s
JOIN public.transactions t
  ON  t.student_id    = s.id
  AND t.type          = 'purchase'
  AND t.payment_status = 'pending'
  AND (
    t.metadata->>'source' = 'historical_kiosk_entry'
    OR t.ticket_code LIKE 'HIS-%'
  )
WHERE s.free_account IS NOT DISTINCT FROM false
  AND s.is_active = true
GROUP BY s.id, s.full_name, s.balance, s.free_account
ORDER BY total_deuda_historica DESC;


-- ══════════════════════════════════════════════════════════════════════
-- PASO 2 (PARCHE — ejecutar SOLO cuando confirmes los datos del PASO 1)
-- Corrige las transacciones históricas pendientes de alumnos en Modo
-- Recarga: las marca como 'paid' y descuenta el monto del balance.
--
-- DESCOMENTA el bloque DO para ejecutarlo.
-- ══════════════════════════════════════════════════════════════════════

/*
DO $patch$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      s.id          AS student_id,
      s.full_name,
      s.balance,
      SUM(ABS(t.amount)) AS total_a_descontar
    FROM public.students s
    JOIN public.transactions t
      ON  t.student_id     = s.id
      AND t.type           = 'purchase'
      AND t.payment_status = 'pending'
      AND (
        t.metadata->>'source' = 'historical_kiosk_entry'
        OR t.ticket_code LIKE 'HIS-%'
      )
    WHERE s.free_account IS NOT DISTINCT FROM false
      AND s.is_active = true
    GROUP BY s.id, s.full_name, s.balance
  LOOP
    -- 1. Marcar las transacciones como pagadas
    UPDATE public.transactions
    SET    payment_status = 'paid'
    WHERE  student_id     = rec.student_id
      AND  type           = 'purchase'
      AND  payment_status = 'pending'
      AND (
        metadata->>'source' = 'historical_kiosk_entry'
        OR ticket_code LIKE 'HIS-%'
      );

    -- 2. Descontar el saldo (puede quedar negativo — es intencional)
    UPDATE public.students
    SET    balance = balance - rec.total_a_descontar
    WHERE  id      = rec.student_id;

    RAISE NOTICE 'Corregido: % | antes: S/ % | descontado: S/ % | después: S/ %',
      rec.full_name,
      rec.balance,
      rec.total_a_descontar,
      rec.balance - rec.total_a_descontar;
  END LOOP;
END;
$patch$;
*/
