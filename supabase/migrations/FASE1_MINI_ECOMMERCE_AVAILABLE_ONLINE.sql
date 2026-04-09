-- ============================================================
-- FASE 1: Mini E-commerce — Columna available_online en products
-- ============================================================
-- Añade available_online (boolean, default false) a la tabla
-- products para que el admin pueda marcar qué productos se
-- muestran en la Tienda Virtual de padres y profesores.
-- ============================================================

-- 1. Añadir columna (safe: idempotente con DO/IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'available_online'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN available_online BOOLEAN NOT NULL DEFAULT false;

    COMMENT ON COLUMN public.products.available_online IS
      'Fase 1 Mini E-commerce: true = visible en la Tienda Virtual de padres y profesores';
  END IF;
END $$;

-- 2. Índice parcial para acelerar las consultas de la tienda virtual
--    (solo indexa las filas que realmente se expondrán al usuario final)
CREATE INDEX IF NOT EXISTS idx_products_available_online
  ON public.products (available_online)
  WHERE available_online = true;

-- 3. Verificación (devuelve las columnas relevantes del catálogo)
-- SELECT id, name, category, price_sale, active, available_online
-- FROM public.products
-- ORDER BY name;
