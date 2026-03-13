-- ============================================================
-- Agregar campos de bloqueo por rango horario a lunch_configuration
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.lunch_configuration
  ADD COLUMN IF NOT EXISTS block_orders_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_start_time TIME DEFAULT '11:00:00',
  ADD COLUMN IF NOT EXISTS block_end_time TIME DEFAULT '14:00:00';

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';

-- ✅ Listo! Ahora puedes activar el bloqueo horario desde la configuración de almuerzos.
