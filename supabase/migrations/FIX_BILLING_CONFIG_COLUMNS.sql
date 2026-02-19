-- ============================================================
-- FIX: Agregar columnas faltantes a billing_config
-- Error: "Could not find the 'activo' column of 'billing_config'"
-- ============================================================

-- Agregar columna 'activo' si no existe
ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Agregar otras columnas opcionales que pueden faltar
ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS igv_porcentaje NUMERIC DEFAULT 18;

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS serie_boleta TEXT DEFAULT 'B001';

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS serie_factura TEXT DEFAULT 'F001';

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS serie_nc_boleta TEXT DEFAULT 'BC01';

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS serie_nc_factura TEXT DEFAULT 'FC01';

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS direccion TEXT DEFAULT '';

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS razon_social TEXT DEFAULT '';

ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS ruc TEXT DEFAULT '';

-- Actualizar filas existentes que tengan activo = NULL
UPDATE billing_config SET activo = true WHERE activo IS NULL;

-- Refrescar el schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'billing_config columns fixed OK' as resultado;
