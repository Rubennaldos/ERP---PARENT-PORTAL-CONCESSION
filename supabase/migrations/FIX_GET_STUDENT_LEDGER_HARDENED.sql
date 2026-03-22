-- ══════════════════════════════════════════════════════════════════════
-- RPC BLINDADA: get_student_ledger (v2 — auditada)
--
-- CORRECCIONES vs v1:
--
-- FIX 1 — Anti-duplicado (Doble Conteo):
--   La aprobación de una recharge_request probablemente crea también
--   un row en transactions (type='recharge'). Para evitar duplicar
--   ese ingreso en el historial, EXCLUIMOS de transactions las recargas
--   cuya metadata indica que vienen de una recharge_request.
--   Las recargas manuales del admin (sin ese metadata) SÍ se incluyen.
--   DIAGNÓSTICO: si aún ves duplicados, ejecuta este SELECT primero:
--     SELECT metadata FROM public.transactions
--     WHERE student_id = '<id>' AND type = 'recharge' LIMIT 5;
--   y ajusta el campo de metadata según tu backend.
--
-- FIX 2 — Paginación (Colapso de Memoria):
--   Agrega p_limit (default 50) y p_offset (default 0).
--   El frontend envía p_limit+1 para detectar si hay más páginas.
--
-- FIX 3 — Orden DESC:
--   Los eventos más recientes primero (natural para "cargar más hacia
--   atrás"). El frontend calcula el running_balance hacia atrás desde
--   el saldo actual real, así el primer número visible siempre es exacto.
--
-- FIX 4 — Empates cronológicos (mantenido):
--   ORDER BY event_date DESC, event_id DESC  ← doble criterio.
-- ══════════════════════════════════════════════════════════════════════

-- Eliminar versión anterior (sin parámetros de paginación)
DROP FUNCTION IF EXISTS public.get_student_ledger(UUID);

CREATE OR REPLACE FUNCTION public.get_student_ledger(
  p_student_id UUID,
  p_limit      INT  DEFAULT 50,
  p_offset     INT  DEFAULT 0
)
RETURNS TABLE (
  event_id       UUID,
  event_type     TEXT,
  source         TEXT,
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

  SELECT event_id, event_type, source, amount, description,
         event_date, payment_status, ticket_code, reference_code, voucher_url
  FROM (

    -- ── RAMA 1: transacciones (compras + recargas manuales del admin) ──────
    SELECT
      t.id                                            AS event_id,
      t.type                                          AS event_type,
      COALESCE(t.metadata->>'source', 'pos')          AS source,
      t.amount,
      t.description,
      t.created_at                                    AS event_date,
      t.payment_status,
      t.ticket_code,
      NULL::TEXT                                      AS reference_code,
      NULL::TEXT                                      AS voucher_url
    FROM public.transactions t
    WHERE t.student_id = p_student_id
      AND (t.is_deleted IS NULL OR t.is_deleted = false)

      -- FIX 1 — Anti-duplicado: excluir recargas vinculadas a recharge_requests
      -- (esas aparecen en la RAMA 2). Las recargas manuales admin no tienen
      -- recharge_request_id ni source de tipo 'recharge_request*' en metadata,
      -- por lo que SÍ se incluyen correctamente.
      AND NOT (
        t.type = 'recharge'
        AND (
          -- El backend almacena el ID de la recharge_request en metadata
          t.metadata->>'recharge_request_id' IS NOT NULL
          OR
          -- O marca el source explícitamente
          t.metadata->>'source' IN (
            'recharge_request',
            'recharge_approval',
            'parent_recharge',
            'recharge_request_approval'
          )
        )
      )

    UNION ALL

    -- ── RAMA 2: recargas aprobadas (padre/tutor vía recharge_requests) ─────
    SELECT
      rr.id                                           AS event_id,
      'recharge'                                      AS event_type,
      'recharge_request'                              AS source,
      rr.amount,
      CONCAT(
        'Recarga aprobada',
        CASE WHEN rr.reference_code IS NOT NULL
             THEN ' · Nº op. ' || rr.reference_code
             ELSE '' END,
        CASE WHEN rr.payment_method IS NOT NULL
             THEN ' (' || rr.payment_method || ')'
             ELSE '' END
      )                                               AS description,
      rr.created_at                                   AS event_date,
      rr.status                                       AS payment_status,
      NULL::TEXT                                      AS ticket_code,
      rr.reference_code,
      rr.voucher_url
    FROM public.recharge_requests rr
    WHERE rr.student_id = p_student_id
      AND rr.status = 'approved'

  ) combined

  -- FIX 3 + 4 — DESC para paginación natural + tiebreaker para empates
  ORDER BY event_date DESC, event_id DESC
  LIMIT  p_limit
  OFFSET p_offset;

$func$;

GRANT EXECUTE ON FUNCTION public.get_student_ledger(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_ledger(UUID, INT, INT) TO service_role;

-- ── DIAGNÓSTICO OPCIONAL: detectar si hay doble conteo activo ─────────────
-- Ejecuta esto para verificar ANTES de usar la RPC en producción:
-- SELECT
--   s.full_name,
--   COUNT(t.id) FILTER (WHERE t.type='recharge')  AS recargas_en_transactions,
--   COUNT(rr.id) FILTER (WHERE rr.status='approved') AS recargas_en_requests,
--   COUNT(t.id) FILTER (WHERE t.type='recharge'
--     AND t.metadata->>'recharge_request_id' IS NOT NULL) AS linked_to_request
-- FROM public.students s
-- LEFT JOIN public.transactions t ON t.student_id = s.id
-- LEFT JOIN public.recharge_requests rr ON rr.student_id = s.id
-- WHERE s.id = '<TU_STUDENT_ID>'
-- GROUP BY s.full_name;
