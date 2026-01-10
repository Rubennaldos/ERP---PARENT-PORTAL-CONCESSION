-- Agregar columna code a la tabla products si no existe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS code TEXT;

-- Crear un índice para búsquedas rápidas por código
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

