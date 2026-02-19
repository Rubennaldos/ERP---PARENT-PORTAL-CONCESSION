-- ============================================================
-- FIX: Agregar TODAS las columnas faltantes a billing_config
-- ============================================================

-- Columnas de Nubefact
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS nubefact_ruta    TEXT    DEFAULT '';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS nubefact_token   TEXT    DEFAULT '';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS ruc              TEXT    DEFAULT '';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS razon_social     TEXT    DEFAULT '';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS direccion        TEXT    DEFAULT '';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS igv_porcentaje   NUMERIC DEFAULT 18;
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS serie_boleta     TEXT    DEFAULT 'B001';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS serie_factura    TEXT    DEFAULT 'F001';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS serie_nc_boleta  TEXT    DEFAULT 'BC01';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS serie_nc_factura TEXT    DEFAULT 'FC01';
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS activo           BOOLEAN DEFAULT true;
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS demo_mode        BOOLEAN DEFAULT true;

-- Columnas de Información de Pago (Yape/Plin/Banco)
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS yape_number       TEXT;
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS plin_number       TEXT;
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS bank_account_info TEXT;
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS show_payment_info BOOLEAN DEFAULT false;

-- Columnas de mensaje y control
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS message_template  TEXT;
ALTER TABLE billing_config ADD COLUMN IF NOT EXISTS updated_by        UUID REFERENCES auth.users(id);

-- Valores por defecto en filas existentes
UPDATE billing_config SET activo = true WHERE activo IS NULL;
UPDATE billing_config SET show_payment_info = false WHERE show_payment_info IS NULL;

-- Refrescar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'billing_config' ORDER BY ordinal_position;
