-- ══════════════════════════════════════════════════════════════════════
-- TRIGGER: Activación automática de modo Recarga al aprobar pago kiosco
-- ══════════════════════════════════════════════════════════════════════
--
-- Cuando una fila en recharge_requests con request_type = 'kiosk_mode_activation'
-- cambia su status a 'approved', este trigger:
--   1. Cambia free_account = false en students (activa modo Recarga)
--   2. Suma el monto aprobado al balance del alumno
--
-- Ejecutar este SQL en el SQL Editor de Supabase.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_kiosk_activation_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo actuar cuando:
  --   1. El tipo de solicitud es activación de kiosco
  --   2. El nuevo estado es 'approved'
  --   3. El estado anterior NO era 'approved' (evitar doble ejecución)
  IF NEW.request_type = 'kiosk_mode_activation'
     AND NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved')
     AND NEW.student_id IS NOT NULL
  THEN
    UPDATE public.students
    SET
      free_account = false,
      balance      = COALESCE(balance, 0) + COALESCE(NEW.amount, 0)
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existía (idempotente)
DROP TRIGGER IF EXISTS trg_kiosk_activation_approval ON public.recharge_requests;

-- Crear el trigger (AFTER UPDATE para leer OLD y NEW)
CREATE TRIGGER trg_kiosk_activation_approval
  AFTER UPDATE ON public.recharge_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_kiosk_activation_approval();

-- ──────────────────────────────────────────────────
-- También manejar el caso de INSERT directo con status=approved
-- (ej. si el admin aprueba en el mismo acto de insertar)
-- ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_kiosk_activation_insert ON public.recharge_requests;

CREATE TRIGGER trg_kiosk_activation_insert
  AFTER INSERT ON public.recharge_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_kiosk_activation_approval();
