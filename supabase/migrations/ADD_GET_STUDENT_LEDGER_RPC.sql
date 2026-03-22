-- ══════════════════════════════════════════════════════════════════════
-- RPC: get_student_ledger
-- Devuelve la línea de tiempo COMPLETA de un alumno, fusionando:
--   · public.transactions    → compras POS, ventas históricas, recargas tipo tx
--   · public.recharge_requests → recargas aprobadas por el padre/tutor
-- Ordenado cronológicamente ASC para calcular running_balance en el frontend.
--
-- Convención de signo (idéntica a la BD):
--   amount < 0  → consumo / gasto
--   amount > 0  → recarga / ingreso
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_student_ledger(p_student_id UUID)
RETURNS TABLE (
  event_id       UUID,
  event_type     TEXT,   -- 'purchase' | 'recharge'
  source         TEXT,   -- 'pos' | 'historical_kiosk_entry' | 'recharge_request' | otros
  amount         NUMERIC,
  description    TEXT,
  event_date     TIMESTAMPTZ,
  payment_status TEXT,
  ticket_code    TEXT,
  reference_code TEXT,
  voucher_url    TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $func$

  -- ── Todas las transacciones del alumno ───────────────────────────────
  SELECT
    t.id                                            AS event_id,
    t.type                                          AS event_type,
    COALESCE(t.metadata->>'source', 'pos')          AS source,
    t.amount                                        AS amount,
    t.description,
    t.created_at                                    AS event_date,
    t.payment_status,
    t.ticket_code,
    NULL::TEXT                                      AS reference_code,
    NULL::TEXT                                      AS voucher_url
  FROM public.transactions t
  WHERE t.student_id = p_student_id
    AND (t.is_deleted IS NULL OR t.is_deleted = false)

  UNION ALL

  -- ── Recargas aprobadas (tabla separada recharge_requests) ───────────
  SELECT
    rr.id                                           AS event_id,
    'recharge'                                      AS event_type,
    'recharge_request'                              AS source,
    rr.amount                                       AS amount,
    CONCAT(
      'Recarga aprobada',
      CASE WHEN rr.reference_code IS NOT NULL
           THEN ' · Nº op. ' || rr.reference_code
           ELSE '' END,
      CASE WHEN rr.payment_method IS NOT NULL
           THEN ' (' || rr.payment_method || ')'
           ELSE '' END
    )                                               AS description,
    COALESCE(rr.updated_at, rr.created_at)         AS event_date,
    rr.status                                       AS payment_status,
    NULL::TEXT                                      AS ticket_code,
    rr.reference_code,
    rr.voucher_url
  FROM public.recharge_requests rr
  WHERE rr.student_id = p_student_id
    AND rr.status = 'approved'

  ORDER BY event_date ASC, event_id ASC;

$func$;

GRANT EXECUTE ON FUNCTION public.get_student_ledger(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_ledger(UUID) TO service_role;
