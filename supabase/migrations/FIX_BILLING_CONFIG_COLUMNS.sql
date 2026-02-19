-- ============================================================
-- FIX: Agregar TODAS las columnas faltantes a billing_config
-- Errores: 'activo', 'nubefact_ruta', 'nubefact_token' not found
-- ============================================================

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

-- Valores por defecto en filas existentes
UPDATE billing_config SET activo = true WHERE activo IS NULL;

-- Refrescar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'billing_config' ORDER BY ordinal_position;
