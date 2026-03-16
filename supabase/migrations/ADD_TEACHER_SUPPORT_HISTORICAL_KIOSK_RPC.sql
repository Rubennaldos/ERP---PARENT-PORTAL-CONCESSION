-- ══════════════════════════════════════════════════════════════════════
-- FIX: insert_historical_kiosk_sale — agregar soporte para teacher_id
-- ══════════════════════════════════════════════════════════════════════
-- Permite registrar ventas históricas tanto para alumnos como profesores.
-- p_teacher_id es opcional (DEFAULT NULL). Si se envía, se usa en vez de
-- p_student_id en la transacción.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.insert_historical_kiosk_sale(
  p_student_id     UUID,
  p_school_id      UUID,
  p_amount         NUMERIC,
  p_description    TEXT,
  p_sale_date      DATE,
  p_created_by     UUID,
  p_metadata       JSONB DEFAULT '{}'::JSONB,
  p_teacher_id     UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_caller_role TEXT;
  v_ticket_code TEXT;
  v_ts          TIMESTAMPTZ;
  v_id          UUID;
BEGIN
  -- Validación de rol
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN (
    'admin_general', 'admin_escuela', 'admin_sede', 'cajero', 'superadmin'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar ventas históricas (rol: %)', COALESCE(v_caller_role, 'sin rol');
  END IF;

  -- Validación de fecha: no puede ser futura
  IF p_sale_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de venta no puede ser una fecha futura (recibida: %, hoy: %)',
      p_sale_date, CURRENT_DATE;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- Timestamp Lima al mediodía del día elegido
  v_ts := (p_sale_date::TEXT || ' 12:00:00 America/Lima')::TIMESTAMPTZ;

  -- Ticket code
  v_ticket_code := 'HIS-' || TO_CHAR(p_sale_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO public.transactions (
    student_id, teacher_id, school_id, type, amount, description,
    payment_status, ticket_code, created_by, created_at, metadata
  ) VALUES (
    CASE WHEN p_teacher_id IS NOT NULL THEN NULL ELSE p_student_id END,
    p_teacher_id,
    p_school_id,
    'purchase',
    -ABS(p_amount),
    p_description,
    'pending',
    v_ticket_code,
    p_created_by,
    v_ts,
    p_metadata || jsonb_build_object(
      'source',      'historical_kiosk_entry',
      'sale_date',   p_sale_date::TEXT,
      'entered_by',  p_created_by::TEXT,
      'client_type', CASE WHEN p_teacher_id IS NOT NULL THEN 'teacher' ELSE 'student' END
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO service_role;
