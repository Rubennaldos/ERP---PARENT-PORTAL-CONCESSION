-- ══════════════════════════════════════════════════════════════════════
-- FIX CRÍTICO: insert_historical_kiosk_sale
-- Bug: la venta histórica NO descontaba saldo a alumnos en Modo Recarga.
--
-- Regla de negocio implementada:
--   · Alumno con free_account = false (Modo Recarga)
--       → payment_status = 'paid'
--       → se descuenta p_amount del balance del alumno (puede quedar negativo
--         si el saldo no alcanza — el faltante queda como deuda implícita en
--         el balance negativo; el admin lo verá en el perfil del alumno)
--   · Alumno con free_account = true / NULL (Modo Libre)
--       → payment_status = 'pending'  (deuda a cobrar luego)
--       → NO se toca el balance
--   · Profesor (p_teacher_id NOT NULL)
--       → payment_status = 'pending'
--       → NO se toca el balance
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
  v_caller_role    TEXT;
  v_ticket_code    TEXT;
  v_ts             TIMESTAMPTZ;
  v_id             UUID;
  v_free_account   BOOLEAN;
  v_payment_status TEXT;
BEGIN
  -- ── Validación de rol ────────────────────────────────────────────────
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN (
    'admin_general', 'admin_escuela', 'admin_sede', 'cajero', 'superadmin'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar ventas históricas (rol: %)',
      COALESCE(v_caller_role, 'sin rol');
  END IF;

  -- ── Validaciones básicas ────────────────────────────────────────────
  IF p_sale_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de venta no puede ser una fecha futura (recibida: %, hoy: %)',
      p_sale_date, CURRENT_DATE;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- ── Determinar modo de cuenta del alumno ────────────────────────────
  -- Solo aplica cuando la venta es para un alumno (no para profesor)
  IF p_teacher_id IS NULL AND p_student_id IS NOT NULL THEN
    SELECT free_account INTO v_free_account
    FROM   public.students
    WHERE  id = p_student_id;

    -- free_account = false  → Modo Recarga → descontar saldo → paid
    -- free_account = true / NULL → Modo Libre → deuda → pending
    IF v_free_account IS NOT DISTINCT FROM false THEN
      v_payment_status := 'paid';
    ELSE
      v_payment_status := 'pending';
    END IF;
  ELSE
    -- Profesor u otro: siempre pending
    v_payment_status := 'pending';
  END IF;

  -- ── Timestamp Lima al mediodía del día elegido ──────────────────────
  v_ts := (p_sale_date::TEXT || ' 12:00:00 America/Lima')::TIMESTAMPTZ;

  -- ── Ticket code ────────────────────────────────────────────────────
  v_ticket_code := 'HIS-' || TO_CHAR(p_sale_date, 'YYYYMMDD') || '-'
                   || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- ── Insertar transacción ───────────────────────────────────────────
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
    v_payment_status,
    v_ticket_code,
    p_created_by,
    v_ts,
    p_metadata || jsonb_build_object(
      'source',       'historical_kiosk_entry',
      'sale_date',    p_sale_date::TEXT,
      'entered_by',   p_created_by::TEXT,
      'client_type',  CASE WHEN p_teacher_id IS NOT NULL THEN 'teacher' ELSE 'student' END,
      'auto_deducted', (v_payment_status = 'paid')
    )
  )
  RETURNING id INTO v_id;

  -- ── Descontar saldo solo si Modo Recarga ───────────────────────────
  IF v_payment_status = 'paid' THEN
    UPDATE public.students
    SET    balance = balance - ABS(p_amount)
    WHERE  id = p_student_id;
    -- Nota: se permite balance negativo intencionalmente.
    -- Un balance negativo significa que el alumno consumió más de lo recargado
    -- en ventas históricas; el admin lo verá en el perfil del alumno.
  END IF;

  RETURN v_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO service_role;
