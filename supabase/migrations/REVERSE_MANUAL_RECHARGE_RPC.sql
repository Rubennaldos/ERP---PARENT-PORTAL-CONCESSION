-- ══════════════════════════════════════════════════════════════════════
-- RPC: reverse_manual_recharge
-- Revierte una recarga manual de forma ATÓMICA:
--   1. Soft-delete de la transacción de recarga
--   2. Resta el monto del balance del alumno
--   3. Marca como 'pending' las compras pagadas más recientes
--      hasta cubrir el monto de la recarga eliminada
--
-- Así, si el alumno debía S/100, recargó S/80 (quedó en -20),
-- al eliminar la recarga: balance vuelve a -100 y los consumos
-- pagados con ese saldo vuelven a quedar como deuda pendiente.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reverse_manual_recharge(
  p_transaction_id  UUID,
  p_admin_id        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id        UUID;
  v_amount            NUMERIC;
  v_old_balance       NUMERIC;
  v_new_balance       NUMERIC;
  v_reversed_count    INTEGER := 0;
  v_reversed_amount   NUMERIC := 0;
  v_remaining         NUMERIC;
  v_tx                RECORD;
BEGIN
  -- 1. Obtener y bloquear la transacción de recarga
  SELECT t.student_id, t.amount
  INTO   v_student_id, v_amount
  FROM   public.transactions t
  WHERE  t.id = p_transaction_id
    AND  t.type = 'recharge'
    AND  (t.is_deleted IS NULL OR t.is_deleted = false)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recarga no encontrada o ya fue eliminada (id: %)', p_transaction_id;
  END IF;

  -- 2. Obtener y bloquear el balance del alumno
  SELECT s.balance
  INTO   v_old_balance
  FROM   public.students s
  WHERE  s.id = v_student_id
  FOR UPDATE;

  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance - v_amount;

  -- 3. Soft-delete de la recarga (marcamos is_deleted + metadata de auditoría)
  UPDATE public.transactions
  SET    is_deleted = true,
         metadata   = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'reversed_at',  (NOW() AT TIME ZONE 'America/Lima')::text,
           'reversed_by',  COALESCE(p_admin_id::text, 'unknown'),
           'original_balance_before', v_old_balance,
           'balance_after_reverse',   v_new_balance
         )
  WHERE  id = p_transaction_id;

  -- 4. Actualizar balance del alumno
  UPDATE public.students
  SET    balance = v_new_balance
  WHERE  id     = v_student_id;

  -- 5. Revertir compras pagadas → pending (las más recientes primero,
  --    hasta cubrir el monto de la recarga eliminada)
  v_remaining := v_amount;

  FOR v_tx IN
    SELECT id, amount
    FROM   public.transactions
    WHERE  student_id      = v_student_id
      AND  type            = 'purchase'
      AND  payment_status  = 'paid'
      AND  (is_deleted IS NULL OR is_deleted = false)
    ORDER  BY created_at DESC
  LOOP
    EXIT WHEN v_remaining <= 0;

    UPDATE public.transactions
    SET    payment_status = 'pending'
    WHERE  id = v_tx.id;

    v_reversed_amount := v_reversed_amount + ABS(v_tx.amount);
    v_reversed_count  := v_reversed_count  + 1;
    v_remaining       := v_remaining - ABS(v_tx.amount);
  END LOOP;

  RETURN jsonb_build_object(
    'success',                  true,
    'student_id',               v_student_id,
    'recharge_amount',          v_amount,
    'old_balance',              v_old_balance,
    'new_balance',              v_new_balance,
    'purchases_marked_pending', v_reversed_count,
    'amount_marked_pending',    v_reversed_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_manual_recharge(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_manual_recharge(UUID, UUID) TO service_role;
