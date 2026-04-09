-- ==========================================================================
-- FASE 2: Mini E-commerce — Tabla online_orders + RPC place_online_order
-- ==========================================================================
-- Decisión de arquitectura:
--   SIEMPRE genera payment_status = 'pending' en transactions.
--   El saldo (balance) del alumno NO se toca aquí: la deuda queda visible
--   en el módulo de Cobranzas y el admin la cobra cuando lo decida.
--   Esto es consistente con el comportamiento de "Cuenta Libre" del POS.
-- ==========================================================================

-- ── 1. TABLA online_orders ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.online_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES public.students(id) ON DELETE SET NULL,
  teacher_id       UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  school_id        UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  transaction_id   UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  total_amount     NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
  status           TEXT NOT NULL DEFAULT 'pending_kitchen'
                     CHECK (status IN ('pending_kitchen','ready','delivered','cancelled')),
  items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.online_orders IS 'Pedidos de la Tienda Virtual (Mini E-commerce). Cada pedido genera una deuda en la tabla transactions.';
COMMENT ON COLUMN public.online_orders.status IS 'pending_kitchen → ready → delivered | cancelled';
COMMENT ON COLUMN public.online_orders.items IS '[{productId, productName, qty, unitPrice, subtotal}]';

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_online_orders_user_id    ON public.online_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_school_id  ON public.online_orders (school_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_student_id ON public.online_orders (student_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_status     ON public.online_orders (status);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON public.online_orders (created_at DESC);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_online_orders_updated_at ON public.online_orders;
CREATE TRIGGER trg_online_orders_updated_at
  BEFORE UPDATE ON public.online_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. ROW LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- (a) El propio usuario ve sus pedidos
CREATE POLICY "online_orders: propietario ve los suyos"
  ON public.online_orders FOR SELECT
  USING (user_id = auth.uid());

-- (b) El propio usuario inserta sus pedidos
--     (la inserción real la hace la RPC con SECURITY DEFINER, pero
--      esta policy permite inserts directos en desarrollo/testing)
CREATE POLICY "online_orders: propietario inserta"
  ON public.online_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- (c) El propio usuario puede cancelar su pedido si aún está pending_kitchen
CREATE POLICY "online_orders: propietario cancela pending"
  ON public.online_orders FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending_kitchen')
  WITH CHECK (status = 'cancelled');

-- (d) Admins y cajeros ven todos los pedidos de su sede
CREATE POLICY "online_orders: admin_general ve todos"
  ON public.online_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin_general', 'admin_sede', 'cajero')
    )
  );

-- ── 3. RPC ATÓMICA: place_online_order ────────────────────────────────────
--
--  Hace en una sola transacción DB:
--    A) INSERT INTO online_orders
--    B) INSERT INTO transactions  (type='purchase', payment_status='pending')
--    C) INSERT INTO transaction_items
--    D) UPDATE online_orders.transaction_id
--  Retorna JSONB con { order_id, transaction_id, ticket_code }
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.place_online_order(
  p_user_id          UUID,          -- auth.uid() del padre o profesor
  p_user_name        TEXT,          -- nombre completo (para la descripción)
  p_school_id        UUID,          -- sede del alumno / del profesor
  p_user_type        TEXT,          -- 'parent' | 'teacher'
  p_total            NUMERIC(10,2), -- monto total del pedido
  p_items            JSONB,         -- [{productId, productName, qty, unitPrice, subtotal}]
  p_student_id       UUID    DEFAULT NULL,  -- students.id  (solo padres)
  p_teacher_id       UUID    DEFAULT NULL,  -- teacher_profiles.id (solo profesores)
  p_notes            TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER           -- ejecuta con permisos de OWNER para sortear RLS en transactions
SET search_path = public
AS $$
DECLARE
  v_order_id        UUID;
  v_transaction_id  UUID;
  v_ticket_code     TEXT;
  v_description     TEXT;
  v_item            JSONB;
BEGIN
  -- Validaciones básicas
  IF p_total <= 0 THEN
    RAISE EXCEPTION 'El monto total debe ser mayor a 0';
  END IF;
  IF p_user_type NOT IN ('parent', 'teacher') THEN
    RAISE EXCEPTION 'user_type debe ser "parent" o "teacher"';
  END IF;
  IF p_user_type = 'parent'  AND p_student_id  IS NULL THEN
    RAISE EXCEPTION 'Para pedidos de padre se requiere student_id';
  END IF;
  IF p_user_type = 'teacher' AND p_teacher_id  IS NULL THEN
    RAISE EXCEPTION 'Para pedidos de profesor se requiere teacher_id';
  END IF;

  -- Generar ticket code único
  v_ticket_code := 'ONL-' || TO_CHAR(now() AT TIME ZONE 'America/Lima', 'YYYYMMDD') || '-' ||
                   UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- Descripción legible
  v_description := 'Tienda Virtual - ' || p_user_name ||
                   ' - S/ ' || p_total::TEXT ||
                   ' (' || TO_CHAR(now() AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI') || ')';

  -- A) Insertar pedido en online_orders
  INSERT INTO public.online_orders (
    user_id, student_id, teacher_id, school_id,
    total_amount, status, items, notes
  ) VALUES (
    p_user_id, p_student_id, p_teacher_id, p_school_id,
    p_total, 'pending_kitchen', p_items, p_notes
  )
  RETURNING id INTO v_order_id;

  -- B) Insertar deuda en transactions (SIEMPRE pending — no toca el balance)
  INSERT INTO public.transactions (
    student_id,
    teacher_id,
    school_id,
    type,
    amount,               -- negativo: salida de dinero
    description,
    balance_after,        -- 0: no modificamos el balance en este flujo
    created_by,
    ticket_code,
    payment_status,
    payment_method,
    metadata
  ) VALUES (
    p_student_id,
    p_teacher_id,
    p_school_id,
    'purchase',
    -ABS(p_total),
    v_description,
    0,
    p_user_id,
    v_ticket_code,
    'pending',
    NULL,
    jsonb_build_object(
      'source',          'online_store',
      'online_order_id', v_order_id,
      'user_type',       p_user_type
    )
  )
  RETURNING id INTO v_transaction_id;

  -- C) Insertar items de la transacción
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.transaction_items (
      transaction_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      subtotal
    ) VALUES (
      v_transaction_id,
      (v_item->>'productId')::UUID,
      v_item->>'productName',
      (v_item->>'qty')::INT,
      (v_item->>'unitPrice')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC
    );
  END LOOP;

  -- D) Vincular la transaction al pedido
  UPDATE public.online_orders
  SET transaction_id = v_transaction_id
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'success',        TRUE,
    'order_id',       v_order_id,
    'transaction_id', v_transaction_id,
    'ticket_code',    v_ticket_code
  );

EXCEPTION WHEN OTHERS THEN
  RAISE; -- re-lanza para que el cliente reciba el error real
END;
$$;

-- Permisos de ejecución: autenticados pueden llamar la función
REVOKE ALL ON FUNCTION public.place_online_order FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.place_online_order TO authenticated;

-- ── 4. Vista de pedidos para cocina/admin ─────────────────────────────────

CREATE OR REPLACE VIEW public.online_orders_view AS
SELECT
  oo.id,
  oo.status,
  oo.total_amount,
  oo.items,
  oo.notes,
  oo.created_at,
  oo.updated_at,
  CASE
    WHEN oo.student_id IS NOT NULL THEN s.full_name
    WHEN oo.teacher_id IS NOT NULL THEN tp.full_name
    ELSE 'Desconocido'
  END AS requester_name,
  CASE
    WHEN oo.student_id IS NOT NULL THEN 'Alumno (padre)'
    WHEN oo.teacher_id IS NOT NULL THEN 'Profesor'
    ELSE '-'
  END AS requester_type,
  sc.name  AS school_name,
  t.payment_status,
  t.ticket_code,
  t.id     AS transaction_id
FROM public.online_orders oo
LEFT JOIN public.students         s  ON s.id  = oo.student_id
LEFT JOIN public.teacher_profiles tp ON tp.id = oo.teacher_id
LEFT JOIN public.schools          sc ON sc.id = oo.school_id
LEFT JOIN public.transactions      t ON t.id  = oo.transaction_id;

-- Verificación post-migración:
-- SELECT id, status, total_amount, requester_name, school_name, ticket_code
-- FROM public.online_orders_view ORDER BY created_at DESC LIMIT 10;
