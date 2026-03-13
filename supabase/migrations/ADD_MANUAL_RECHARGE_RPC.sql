-- ══════════════════════════════════════════════════════════════════════
-- RPC: Recarga manual de saldo (admin → alumno)
-- ══════════════════════════════════════════════════════════════════════
--
-- Función ATÓMICA: en una sola transacción hace:
--   1. UPDATE students.balance += monto
--   2. INSERT en transactions (type=recharge, payment_status=paid)
--
-- Si cualquiera falla, se revierte todo.
--
-- Ejecutar en SQL Editor de Supabase.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_manual_recharge(
  p_student_id      UUID,
  p_amount          NUMERIC,
  p_payment_method  TEXT,            -- 'efectivo', 'yape', 'plin', 'transferencia'
  p_description     TEXT DEFAULT '',
  p_admin_id        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance   NUMERIC;
  v_new_balance   NUMERIC;
  v_school_id     UUID;
  v_student_name  TEXT;
  v_tx_id         UUID;
  v_ticket_code   TEXT;
BEGIN
  -- Validar monto
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- Obtener datos del estudiante con lock para evitar race condition
  SELECT s.balance, s.school_id, s.full_name
  INTO   v_old_balance, v_school_id, v_student_name
  FROM   public.students s
  WHERE  s.id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance + p_amount;

  -- Generar ticket code
  v_ticket_code := 'REC-' || TO_CHAR(NOW() AT TIME ZONE 'America/Lima', 'YYYYMMDD') 
                   || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- 1) Insertar transacción
  INSERT INTO public.transactions (
    student_id,
    school_id,
    type,
    amount,
    description,
    payment_status,
    payment_method,
    ticket_code,
    balance_after,
    created_by,
    metadata
  ) VALUES (
    p_student_id,
    v_school_id,
    'recharge',
    p_amount,
    COALESCE(NULLIF(p_description, ''), 'Recarga manual por administrador'),
    'paid',
    p_payment_method,
    v_ticket_code,
    v_new_balance,
    p_admin_id,
    jsonb_build_object(
      'source',          'admin_manual_recharge',
      'previous_balance', v_old_balance,
      'new_balance',      v_new_balance,
      'admin_id',         COALESCE(p_admin_id::text, 'unknown')
    )
  )
  RETURNING id INTO v_tx_id;

  -- 2) Actualizar balance del estudiante
  UPDATE public.students
  SET    balance = v_new_balance
  WHERE  id = p_student_id;

  -- Retornar resumen
  RETURN jsonb_build_object(
    'success',          true,
    'transaction_id',   v_tx_id,
    'ticket_code',      v_ticket_code,
    'student_name',     v_student_name,
    'previous_balance', v_old_balance,
    'amount',           p_amount,
    'new_balance',      v_new_balance
  );
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.process_manual_recharge TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_manual_recharge TO service_role;
