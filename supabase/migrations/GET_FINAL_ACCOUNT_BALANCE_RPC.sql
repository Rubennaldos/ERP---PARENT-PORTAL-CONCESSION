-- ============================================================
-- RPC: get_final_account_balance
-- FUENTE DE VERDAD ÚNICA para saldo/deuda de cualquier cliente.
--
-- Fórmula siempre consistente:
--   total_debt = SUM(pending tickets) + SUM(partial tickets - partial_paid_amount)
--   net_balance = wallet_balance - total_debt
--
-- Un saldo negativo = el cliente DEBE dinero.
-- Un saldo positivo = el cliente tiene crédito.
--
-- IMPORTANTE: NO se filtra por metadata.source. Cualquier compra
-- pendiente o parcial cuenta como deuda, sin importar el origen.
-- ============================================================

CREATE OR REPLACE FUNCTION get_final_account_balance(
  p_student_id UUID DEFAULT NULL,
  p_teacher_id UUID DEFAULT NULL
)
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
  IF p_student_id IS NOT NULL THEN
    SELECT COALESCE(balance, 0)
      INTO v_wallet_balance
      FROM public.students
     WHERE id = p_student_id;
  END IF;

  -- 2) Deuda de tickets en status 'pending' o NULL (kiosco histórico sin estado explícito)
  --    NULL se trata como pendiente porque nunca se marcó como pagado.
  IF p_student_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0)
      INTO v_pending_debt
      FROM public.transactions
     WHERE student_id      = p_student_id
       AND type            = 'purchase'
       AND (payment_status = 'pending' OR payment_status IS NULL)
       AND NOT COALESCE(is_deleted, false);

  ELSIF p_teacher_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0)
      INTO v_pending_debt
      FROM public.transactions
     WHERE teacher_id      = p_teacher_id
       AND type            = 'purchase'
       AND (payment_status = 'pending' OR payment_status IS NULL)
       AND NOT COALESCE(is_deleted, false);
  END IF;

  -- 3) Deuda RESTANTE de tickets en status 'partial'
  --    Restante = ABS(amount) - partial_paid_amount (guardado en metadata)
  IF p_student_id IS NOT NULL THEN
    FOR v_tx IN
      SELECT ABS(amount) AS full_amount,
             GREATEST(0, COALESCE((metadata->>'partial_paid_amount')::NUMERIC, 0)) AS paid
        FROM public.transactions
       WHERE student_id     = p_student_id
         AND type           = 'purchase'
         AND payment_status = 'partial'
         AND NOT COALESCE(is_deleted, false)
    LOOP
      v_partial_remaining := v_partial_remaining
                           + GREATEST(0, v_tx.full_amount - v_tx.paid);
    END LOOP;

  ELSIF p_teacher_id IS NOT NULL THEN
    FOR v_tx IN
      SELECT ABS(amount) AS full_amount,
             GREATEST(0, COALESCE((metadata->>'partial_paid_amount')::NUMERIC, 0)) AS paid
        FROM public.transactions
       WHERE teacher_id     = p_teacher_id
         AND type           = 'purchase'
         AND payment_status = 'partial'
         AND NOT COALESCE(is_deleted, false)
    LOOP
      v_partial_remaining := v_partial_remaining
                           + GREATEST(0, v_tx.full_amount - v_tx.paid);
    END LOOP;
  END IF;

  -- 4) Abonos / créditos registrados en transactions (pagos explícitos y recargas)
  IF p_student_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0)
      INTO v_total_credits
      FROM public.transactions
     WHERE student_id = p_student_id
       AND type IN ('payment', 'recharge')
       AND NOT COALESCE(is_deleted, false);
  ELSIF p_teacher_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0)
      INTO v_total_credits
      FROM public.transactions
     WHERE teacher_id = p_teacher_id
       AND type IN ('payment', 'recharge')
       AND NOT COALESCE(is_deleted, false);
  END IF;

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

GRANT EXECUTE ON FUNCTION get_final_account_balance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_final_account_balance(UUID, UUID) TO anon;
