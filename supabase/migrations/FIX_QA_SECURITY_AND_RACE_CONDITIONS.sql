-- ══════════════════════════════════════════════════════════════════════
-- FIX CRÍTICO #1: Agregar validación de rol a process_manual_recharge
-- FIX ALTA   #2: Agregar validación de fecha futura a insert_historical_kiosk_sale
-- FIX ALTA   #3: Agregar RPC atómica para descuento de saldo en POS
--               (evita race condition en modo Recarga)
-- ══════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- FIX #1: process_manual_recharge — solo admins pueden ejecutarla
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_manual_recharge(
  p_student_id      UUID,
  p_amount          NUMERIC,
  p_payment_method  TEXT,
  p_description     TEXT DEFAULT '',
  p_admin_id        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role   TEXT;
  v_old_balance   NUMERIC;
  v_new_balance   NUMERIC;
  v_school_id     UUID;
  v_student_name  TEXT;
  v_tx_id         UUID;
  v_ticket_code   TEXT;
BEGIN
  -- ── VALIDACIÓN DE ROL: solo admins pueden ejecutar esta función ──
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN (
    'admin_general', 'admin_escuela', 'admin_sede', 'cajero', 'superadmin'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para realizar recargas manuales (rol: %)', COALESCE(v_caller_role, 'sin rol');
  END IF;

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
    student_id, school_id, type, amount, description,
    payment_status, payment_method, ticket_code, balance_after, created_by, metadata
  ) VALUES (
    p_student_id, v_school_id, 'recharge', p_amount,
    COALESCE(NULLIF(p_description, ''), 'Recarga manual por administrador'),
    'paid', p_payment_method, v_ticket_code, v_new_balance, p_admin_id,
    jsonb_build_object(
      'source',           'admin_manual_recharge',
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

GRANT EXECUTE ON FUNCTION public.process_manual_recharge TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_manual_recharge TO service_role;


-- ──────────────────────────────────────────────────────────────────────
-- FIX #2: insert_historical_kiosk_sale — bloquear fechas futuras en SQL
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_historical_kiosk_sale(
  p_student_id     UUID,
  p_school_id      UUID,
  p_amount         NUMERIC,
  p_description    TEXT,
  p_sale_date      DATE,
  p_created_by     UUID,
  p_metadata       JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_ticket_code TEXT;
  v_ts          TIMESTAMPTZ;
  v_id          UUID;
BEGIN
  -- ── VALIDACIÓN DE ROL ──
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN (
    'admin_general', 'admin_escuela', 'admin_sede', 'cajero', 'superadmin'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar ventas históricas (rol: %)', COALESCE(v_caller_role, 'sin rol');
  END IF;

  -- ── VALIDACIÓN DE FECHA: no puede ser futura ──
  IF p_sale_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de venta no puede ser una fecha futura (recibida: %, hoy: %)',
      p_sale_date, CURRENT_DATE;
  END IF;

  -- Validar monto
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- Construir timestamp Lima al mediodía del día elegido
  v_ts := (p_sale_date::TEXT || ' 12:00:00 America/Lima')::TIMESTAMPTZ;

  -- Ticket code
  v_ticket_code := 'HIS-' || TO_CHAR(p_sale_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO public.transactions (
    student_id, school_id, type, amount, description,
    payment_status, ticket_code, created_by, created_at, metadata
  ) VALUES (
    p_student_id, p_school_id, 'purchase', -ABS(p_amount), p_description,
    'pending', v_ticket_code, p_created_by, v_ts,
    p_metadata || jsonb_build_object(
      'source',     'historical_kiosk_entry',
      'sale_date',  p_sale_date::TEXT,
      'entered_by', p_created_by::TEXT
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO service_role;


-- ──────────────────────────────────────────────────────────────────────
-- FIX #3: RPC atómica para descuento de saldo en POS (modo Recarga)
-- Reemplaza el UPDATE directo desde el cliente para evitar race conditions
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_kiosk_balance(
  p_student_id      UUID,
  p_amount          NUMERIC,   -- positivo; se guarda negativo en transactions
  p_description     TEXT,
  p_ticket_code     TEXT,
  p_created_by      UUID,
  p_metadata        JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance  NUMERIC;
  v_new_balance  NUMERIC;
  v_school_id    UUID;
  v_tx_id        UUID;
BEGIN
  -- Lock de fila para evitar race condition
  SELECT balance, school_id
  INTO   v_old_balance, v_school_id
  FROM   public.students
  WHERE  id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance - ABS(p_amount);

  -- Insertar transacción
  INSERT INTO public.transactions (
    student_id, school_id, type, amount, description,
    payment_status, ticket_code, balance_after, created_by, metadata
  ) VALUES (
    p_student_id, v_school_id, 'purchase', -ABS(p_amount), p_description,
    'paid', p_ticket_code, v_new_balance, p_created_by,
    p_metadata || jsonb_build_object('source', 'pos')
  )
  RETURNING id INTO v_tx_id;

  -- Actualizar saldo
  UPDATE public.students
  SET    balance = v_new_balance
  WHERE  id = p_student_id;

  RETURN jsonb_build_object(
    'success',           true,
    'transaction_id',    v_tx_id,
    'previous_balance',  v_old_balance,
    'amount_deducted',   ABS(p_amount),
    'new_balance',       v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_kiosk_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_kiosk_balance TO service_role;
