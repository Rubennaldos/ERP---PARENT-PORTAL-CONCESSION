-- ══════════════════════════════════════════════════════════════════════
-- RPC: Insertar venta histórica del kiosco con fecha personalizada
-- ══════════════════════════════════════════════════════════════════════
--
-- El cliente NO puede hacer UPDATE de created_at directamente (bloqueado por RLS).
-- Esta función SECURITY DEFINER actúa con privilegios de postgres y permite
-- insertar una transacción con created_at = fecha_venta pasada por el admin.
--
-- Usar desde el frontend:
--   supabase.rpc('insert_historical_kiosk_sale', { ... })
--
-- Ejecutar en el SQL Editor de Supabase.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.insert_historical_kiosk_sale(
  p_student_id     UUID,
  p_school_id      UUID,
  p_amount         NUMERIC,          -- positivo; se guarda como negativo internamente
  p_description    TEXT,
  p_sale_date      DATE,             -- fecha histórica que eligió el admin
  p_created_by     UUID,
  p_metadata       JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_code TEXT;
  v_ts          TIMESTAMPTZ;
  v_id          UUID;
BEGIN
  -- Construir timestamp con zona Lima al mediodía del día elegido
  -- (evita ambigüedad de hora sin asumir horario de compra)
  v_ts := (p_sale_date::TEXT || ' 12:00:00 America/Lima')::TIMESTAMPTZ;

  -- Ticket code simple
  v_ticket_code := 'HIS-' || TO_CHAR(p_sale_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO public.transactions (
    student_id,
    school_id,
    type,
    amount,
    description,
    payment_status,
    ticket_code,
    created_by,
    created_at,
    metadata
  ) VALUES (
    p_student_id,
    p_school_id,
    'purchase',
    -ABS(p_amount),               -- siempre negativo (consumo)
    p_description,
    'pending',                    -- cuenta libre → queda como deuda
    v_ticket_code,
    p_created_by,
    v_ts,                         -- fecha histórica
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

-- Dar permisos a roles que usan el cliente Supabase
GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_historical_kiosk_sale TO service_role;
