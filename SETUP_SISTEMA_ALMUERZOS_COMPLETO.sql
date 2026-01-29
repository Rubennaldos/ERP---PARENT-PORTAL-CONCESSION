-- =====================================================
-- SISTEMA COMPLETO DE ALMUERZOS v2.0
-- =====================================================
-- Incluye:
-- 1. Tabla de pedidos de almuerzo (lunch_orders) con nuevos estados
-- 2. Soporte para estudiantes temporales (puentes temporales)
-- 3. Deudas automáticas por almuerzos entregados sin pedido
-- 4. Historial de acciones (postergado, anulado, entregado)
-- =====================================================

-- =====================================================
-- 1. ACTUALIZAR TABLA lunch_orders CON NUEVOS ESTADOS
-- =====================================================

-- Agregar nuevas columnas
ALTER TABLE public.lunch_orders 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS postponed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS postponement_reason TEXT,
ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS postponed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_no_order_delivery BOOLEAN DEFAULT false; -- Para Opción A

-- Comentarios
COMMENT ON COLUMN public.lunch_orders.delivered_at IS 'Fecha y hora en que se entregó el almuerzo';
COMMENT ON COLUMN public.lunch_orders.cancelled_at IS 'Fecha y hora en que se anuló el pedido';
COMMENT ON COLUMN public.lunch_orders.postponed_at IS 'Fecha y hora en que se postergó el pedido';
COMMENT ON COLUMN public.lunch_orders.cancellation_reason IS 'Razón de anulación del pedido';
COMMENT ON COLUMN public.lunch_orders.postponement_reason IS 'Razón de postergación del pedido';
COMMENT ON COLUMN public.lunch_orders.is_no_order_delivery IS 'True si el almuerzo se entregó sin pedido previo (Opción A - genera deuda automática)';

-- Actualizar el check constraint de status
ALTER TABLE public.lunch_orders DROP CONSTRAINT IF EXISTS lunch_orders_status_check;
ALTER TABLE public.lunch_orders 
ADD CONSTRAINT lunch_orders_status_check 
CHECK (status IN (
  'confirmed',           -- Pedido confirmado
  'delivered',           -- Entregado
  'cancelled',           -- Anulado
  'postponed',           -- Postergado
  'pending_payment'      -- Pendiente de pago (padre va a pagar después)
));

-- =====================================================
-- 2. AGREGAR SOPORTE PARA ESTUDIANTES TEMPORALES
-- =====================================================

-- Agregar columna is_temporary a la tabla students
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS temporary_classroom_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS temporary_notes TEXT;

-- Índice
CREATE INDEX IF NOT EXISTS idx_students_is_temporary ON public.students(is_temporary);

-- Comentarios
COMMENT ON COLUMN public.students.is_temporary IS 'True si es un estudiante temporal (puente temporal) sin padre asociado';
COMMENT ON COLUMN public.students.temporary_classroom_name IS 'Nombre del salón ingresado manualmente (para estudiantes temporales)';
COMMENT ON COLUMN public.students.temporary_notes IS 'Notas adicionales sobre el estudiante temporal';

-- =====================================================
-- 3. CREAR FUNCIÓN PARA "ENTREGAR SIN PEDIDO PREVIO"
-- =====================================================
-- Esta función implementa la Opción A: Deuda automática

CREATE OR REPLACE FUNCTION create_lunch_delivery_no_order(
  p_student_id UUID,
  p_order_date DATE,
  p_delivered_by UUID,
  p_lunch_price NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_lunch_order_id UUID;
  v_transaction_id UUID;
  v_student_school_id UUID;
BEGIN
  -- Obtener la sede del estudiante
  SELECT school_id INTO v_student_school_id
  FROM public.students
  WHERE id = p_student_id;

  -- Crear el pedido de almuerzo (marcado como "sin pedido previo")
  INSERT INTO public.lunch_orders (
    student_id,
    order_date,
    status,
    delivered_at,
    delivered_by,
    is_no_order_delivery,
    ordered_at
  )
  VALUES (
    p_student_id,
    p_order_date,
    'delivered',
    NOW(),
    p_delivered_by,
    true, -- Es una entrega sin pedido previo
    NOW()
  )
  RETURNING id INTO v_lunch_order_id;

  -- Crear la transacción (deuda) automáticamente
  INSERT INTO public.transactions (
    student_id,
    type,
    amount,
    description,
    payment_method,
    school_id,
    created_at
  )
  VALUES (
    p_student_id,
    'purchase',
    -p_lunch_price,
    'Almuerzo entregado sin pedido previo - ' || TO_CHAR(p_order_date, 'DD/MM/YYYY'),
    'student_account',
    v_student_school_id,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'lunch_order_id', v_lunch_order_id,
    'transaction_id', v_transaction_id,
    'message', 'Almuerzo entregado y deuda creada exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION create_lunch_delivery_no_order TO authenticated;

COMMENT ON FUNCTION create_lunch_delivery_no_order IS 
'Registra la entrega de un almuerzo sin pedido previo y crea una deuda automática para el estudiante.
Implementa la Opción A para estudiantes con cuenta crédito cuyos padres se olvidaron de pedir.';

-- =====================================================
-- 4. CREAR FUNCIÓN PARA "CREAR PUENTE TEMPORAL"
-- =====================================================
-- Esta función implementa la Opción B: Estudiante temporal

CREATE OR REPLACE FUNCTION create_temporary_student(
  p_full_name VARCHAR,
  p_classroom_name VARCHAR,
  p_school_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Crear estudiante temporal
  INSERT INTO public.students (
    full_name,
    school_id,
    free_account,
    is_temporary,
    temporary_classroom_name,
    temporary_notes,
    is_active,
    parent_id
  )
  VALUES (
    p_full_name,
    p_school_id,
    true, -- Cuenta crédito activada
    true, -- Es temporal
    p_classroom_name,
    p_notes,
    true,
    NULL -- Sin padre asociado
  )
  RETURNING id INTO v_student_id;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'student_id', v_student_id,
    'message', 'Estudiante temporal creado exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION create_temporary_student TO authenticated;

COMMENT ON FUNCTION create_temporary_student IS 
'Crea un estudiante temporal (puente temporal) sin padre asociado.
Implementa la Opción B para estudiantes sin cuenta ni portal que necesitan almuerzo.';

-- =====================================================
-- 5. POLÍTICAS RLS PARA ESTUDIANTES TEMPORALES
-- =====================================================

-- Los admins/cajeros pueden ver estudiantes temporales
DROP POLICY IF EXISTS "Admins can view temporary students" ON public.students;
CREATE POLICY "Admins can view temporary students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    -- Si es un estudiante temporal, solo admins/cajeros pueden verlo
    (is_temporary = true AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'operador_caja', 'gestor_unidad', 'supervisor_red')
    ))
    OR
    -- Si no es temporal, aplican las políticas normales
    is_temporary = false
  );

-- =====================================================
-- 6. RESTRICCIÓN: POSTERGAR/ANULAR SOLO ANTES DE LAS 9 AM
-- =====================================================
-- Esta validación se hará en el frontend, pero podemos agregar una función helper

CREATE OR REPLACE FUNCTION can_modify_lunch_order(p_order_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_time_peru TIME;
  v_deadline TIME := '09:00:00';
BEGIN
  -- Obtener hora actual en Perú (UTC-5)
  v_current_time_peru := (NOW() AT TIME ZONE 'America/Lima')::TIME;
  
  -- Solo se puede modificar antes de las 9 AM del día del pedido
  IF p_order_date = CURRENT_DATE AND v_current_time_peru >= v_deadline THEN
    RETURN false;
  ELSE
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_modify_lunch_order IS 
'Verifica si un pedido de almuerzo puede ser modificado (postergado/anulado).
Retorna false después de las 9:00 AM hora de Perú del día del pedido.';

-- =====================================================
-- 7. ÍNDICES ADICIONALES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lunch_orders_status ON public.lunch_orders(status);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_order_date ON public.lunch_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_is_no_order_delivery ON public.lunch_orders(is_no_order_delivery);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_delivered_at ON public.lunch_orders(delivered_at);

-- =====================================================
-- ✅ SISTEMA DE ALMUERZOS COMPLETO IMPLEMENTADO
-- =====================================================

COMMENT ON TABLE public.lunch_orders IS 
'Tabla de pedidos de almuerzo con soporte para:
- Pedidos normales (con pago previo o crédito)
- Entregas sin pedido previo (genera deuda automática)
- Estudiantes temporales (puentes temporales)
- Estados: confirmado, entregado, cancelado, postergado, pendiente de pago
- Restricción: No se puede postergar/anular después de las 9 AM';

-- =====================================================
-- 8. DATOS DE EJEMPLO (OPCIONAL - COMENTAR SI NO QUIERES)
-- =====================================================

-- Ejemplo de cómo usar las funciones:

-- Opción A: Entregar almuerzo sin pedido previo (genera deuda)
-- SELECT create_lunch_delivery_no_order(
--   'uuid-del-estudiante',
--   '2026-01-30'::DATE,
--   'uuid-del-admin',
--   5.50
-- );

-- Opción B: Crear estudiante temporal
-- SELECT create_temporary_student(
--   'Juan Pérez (Temporal)',
--   '3ro A',
--   'uuid-de-la-sede',
--   'Padre sin cuenta, viene mañana a pagar'
-- );
