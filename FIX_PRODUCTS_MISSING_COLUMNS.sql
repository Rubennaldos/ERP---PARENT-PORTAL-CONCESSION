-- ============================================================
-- AGREGAR COLUMNAS FALTANTES A TABLA PRODUCTS
-- ============================================================
-- Error: Could not find the 'expiry_days' column of 'products'

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expiry_days INTEGER,
  ADD COLUMN IF NOT EXISTS has_wholesale BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wholesale_qty INTEGER,
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10,2);

NOTIFY pgrst, 'reload schema';

-- ✅ Listo! Columnas agregadas a products.
