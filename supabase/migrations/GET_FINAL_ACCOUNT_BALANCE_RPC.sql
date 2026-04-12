-- ============================================================
-- RPC: get_final_account_balance
-- FUENTE DE VERDAD ÚNICA para saldo/deuda de cualquier cliente.
--
-- Parámetro único: p_target_id
--   → puede ser el id de un alumno (students.id)
--   → o el id de un profesor (teacher_profiles.id)
--   La función busca en ambas columnas (student_id OR teacher_id).
--
-- Fórmula:
--   total_debt = SUM(pending/NULL tickets) + SUM(partial tickets restantes)
--   net_balance = wallet_balance - total_debt
--
-- IMPORTANTE: payment_status IS NULL se trata como 'pending'
-- (tickets del kiosco histórico importados sin estado explícito).
-- ============================================================

-- Eliminar firmas previas para evitar error al renombrar parámetros
DROP FUNCTION IF EXISTS get_final_account_balance(UUID, UUID);
DROP FUNCTION IF EXISTS get_final_account_balance(UUID);

CREATE OR REPLACE FUNCTION get_final_account_balance(p_target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_balance    NUMERIC := 0;
  v_pending_debt      NUMERIC := 0;
  v_partial_remaining NUMERIC := 0;
  v_total_debt        NUMERIC := 0;
  v_net_balance       NUMERIC := 0;
  v_total_credits     NUMERIC := 0;
  v_tx                RECORD;
BEGIN
  -- 1) Saldo en billetera (solo aplica a estudiantes prepago)
  SELECT COALESCE(balance, 0)
    INTO v_wallet_balance
    FROM public.students
   WHERE id = p_target_id;
  -- Si no hay fila (es profesor), SELECT INTO deja NULL → forzar a 0
  v_wallet_balance := COALESCE(v_wallet_balance, 0);

  -- 2) Deuda de tickets en status 'pending' o NULL
  --    (kiosco histórico importado sin estado explícito = pendiente)
  SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_pending_debt
    FROM public.transactions
   WHERE (student_id = p_target_id OR teacher_id = p_target_id)
     AND type            = 'purchase'
     AND (payment_status = 'pending' OR payment_status IS NULL)
     AND NOT COALESCE(is_deleted, false);

  -- 3) Deuda RESTANTE de tickets en status 'partial'
  --    Restante = ABS(amount) - partial_paid_amount (guardado en metadata)
  FOR v_tx IN
    SELECT ABS(amount) AS full_amount,
           GREATEST(0, COALESCE((metadata->>'partial_paid_amount')::NUMERIC, 0)) AS paid
      FROM public.transactions
     WHERE (student_id = p_target_id OR teacher_id = p_target_id)
       AND type           = 'purchase'
       AND payment_status = 'partial'
       AND NOT COALESCE(is_deleted, false)
  LOOP
    v_partial_remaining := v_partial_remaining
                         + GREATEST(0, v_tx.full_amount - v_tx.paid);
  END LOOP;

  -- 4) Abonos y recargas registradas explícitamente
  SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_total_credits
    FROM public.transactions
   WHERE (student_id = p_target_id OR teacher_id = p_target_id)
     AND type IN ('payment', 'recharge')
     AND NOT COALESCE(is_deleted, false);

  -- 5) Totales
  v_total_debt  := v_pending_debt + v_partial_remaining;
  v_net_balance := v_wallet_balance - v_total_debt;

  RETURN jsonb_build_object(
    'total_debt',          v_total_debt,
    'pending_debt',        v_pending_debt,
    'partial_remaining',   v_partial_remaining,
    'total_credits',       v_total_credits,
    'wallet_balance',      v_wallet_balance,
    'net_balance',         v_net_balance,
    'is_debtor',           v_total_debt > 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_final_account_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_final_account_balance(UUID) TO anon;
