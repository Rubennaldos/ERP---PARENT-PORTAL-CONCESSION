-- ══════════════════════════════════════════════════════════════════════
-- RPC: Aprobar voucher de RECARGA de saldo (atómica, con auto-saldar deudas)
-- ══════════════════════════════════════════════════════════════════════
--
-- Reemplaza el bloque no-atómico en VoucherApproval.tsx handleApprove()
-- para el caso request_type = 'recharge' o 'kiosk_mode_activation'.
--
-- En una sola transacción con FOR UPDATE hace:
--   1. Verifica que la solicitud exista y esté en status 'pending'
--   2. Marca recharge_request como 'approved'
--   3. Inserta transacción de recarga
--   4. Auto-salda deudas kiosco pendientes si el saldo alcanza
--   5. Actualiza students.balance y free_account = false
--
-- Si cualquiera falla, se revierte todo.
--
-- Ejecutar en SQL Editor de Supabase antes de usar el nuevo VoucherApproval.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.approve_voucher_recharge(
  p_request_id     UUID,
  p_admin_id       UUID,
  p_reference_code TEXT DEFAULT NULL   -- override si el padre no lo puso
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req            RECORD;
  v_student        RECORD;
  v_old_balance    NUMERIC;
  v_new_balance    NUMERIC;
  v_tx_id          UUID;
  v_ticket_code    TEXT;
  v_final_code     TEXT;
  v_auto_settled   INT := 0;
  v_debt           RECORD;
  v_debt_amount    NUMERIC;
BEGIN
  -- 1. Obtener la solicitud
  SELECT *
  INTO   v_req
  FROM   public.recharge_requests
  WHERE  id = p_request_id
  FOR UPDATE;  -- lock anti-doble aprobación

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'La solicitud ya fue procesada (estado: %)', v_req.status;
  END IF;

  -- 2. Obtener el alumno con lock
  SELECT balance, school_id, full_name, free_account
  INTO   v_student
  FROM   public.students
  WHERE  id = v_req.student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alumno no encontrado';
  END IF;

  v_old_balance := COALESCE(v_student.balance, 0);
  v_new_balance := v_old_balance + v_req.amount;
  v_final_code  := COALESCE(NULLIF(TRIM(p_reference_code), ''), v_req.reference_code);

  -- 3. Marcar solicitud como aprobada
  UPDATE public.recharge_requests
  SET    status       = 'approved',
         approved_by  = p_admin_id,
         approved_at  = NOW(),
         reference_code = COALESCE(NULLIF(TRIM(p_reference_code), ''), reference_code)
  WHERE  id = p_request_id;

  -- 4. Generar ticket code
  v_ticket_code := 'REC-' || TO_CHAR(NOW() AT TIME ZONE 'America/Lima', 'YYYYMMDD')
                   || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- 5. Insertar transacción de recarga
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
    metadata
  ) VALUES (
    v_req.student_id,
    v_req.school_id,
    'recharge',
    v_req.amount,
    COALESCE(
      NULLIF(v_req.description, ''),
      'Recarga aprobada — ' || v_req.payment_method ||
      CASE WHEN v_final_code IS NOT NULL THEN ' (Ref: ' || v_final_code || ')' ELSE '' END
    ),
    'paid',
    v_req.payment_method,
    v_ticket_code,
    v_new_balance,
    jsonb_build_object(
      'source',              'voucher_recharge',
      'recharge_request_id', p_request_id,
      'reference_code',      v_final_code,
      'approved_by',         p_admin_id,
      'voucher_url',         v_req.voucher_url
    )
  )
  RETURNING id INTO v_tx_id;

  -- 6. Auto-saldar deudas kiosco pendientes (orden cronológico, mientras alcance saldo)
  FOR v_debt IN
    SELECT id, amount
    FROM   public.transactions
    WHERE  student_id    = v_req.student_id
      AND  type          = 'purchase'
      AND  payment_status = 'pending'
    ORDER BY created_at ASC
  LOOP
    v_debt_amount := ABS(v_debt.amount);
    EXIT WHEN v_new_balance < v_debt_amount;

    UPDATE public.transactions
    SET    payment_status = 'paid',
           payment_method = 'balance',
           metadata       = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                              'auto_settled',         true,
                              'settled_from_recharge', p_request_id,
                              'settled_at',           NOW()
                            )
    WHERE  id = v_debt.id;

    v_new_balance  := v_new_balance - v_debt_amount;
    v_auto_settled := v_auto_settled + 1;
  END LOOP;

  -- 7. Actualizar balance del alumno y activar modo Recarga
  UPDATE public.students
  SET    balance      = v_new_balance,
         free_account = false
  WHERE  id = v_req.student_id;

  -- 8. Retornar resumen
  RETURN jsonb_build_object(
    'success',           true,
    'transaction_id',    v_tx_id,
    'ticket_code',       v_ticket_code,
    'student_name',      v_student.full_name,
    'previous_balance',  v_old_balance,
    'amount_recharged',  v_req.amount,
    'new_balance',       v_new_balance,
    'auto_settled_count', v_auto_settled,
    'reference_code',    v_final_code
  );
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.approve_voucher_recharge TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_voucher_recharge TO service_role;
