-- =====================================================
-- FIX: Agregar TODAS las columnas faltantes a billing_config
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Columnas de información de pago
ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS yape_holder TEXT,
  ADD COLUMN IF NOT EXISTS plin_holder TEXT,
  ADD COLUMN IF NOT EXISTS yape_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS plin_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS transferencia_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_payment_info BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_cci TEXT;

-- Columnas de Nubefact / facturación
ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS nubefact_ruta TEXT,
  ADD COLUMN IF NOT EXISTS nubefact_token TEXT,
  ADD COLUMN IF NOT EXISTS ruc TEXT,
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS igv_porcentaje NUMERIC(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS serie_boleta TEXT DEFAULT 'B001',
  ADD COLUMN IF NOT EXISTS serie_factura TEXT DEFAULT 'F001',
  ADD COLUMN IF NOT EXISTS serie_nc_boleta TEXT DEFAULT 'BC01',
  ADD COLUMN IF NOT EXISTS serie_nc_factura TEXT DEFAULT 'FC01',
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Columnas base que podrían faltar
ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS message_template TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_info TEXT,
  ADD COLUMN IF NOT EXISTS yape_number TEXT,
  ADD COLUMN IF NOT EXISTS plin_number TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Recargar schema de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación: mostrar todas las columnas actuales
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'billing_config'
ORDER BY ordinal_position;
