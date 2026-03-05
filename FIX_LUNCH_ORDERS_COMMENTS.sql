-- ============================================================
-- AGREGAR CAMPO DE COMENTARIOS A PEDIDOS DE ALMUERZO
-- ============================================================
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna 'comments' a la tabla lunch_orders
ALTER TABLE public.lunch_orders
  ADD COLUMN IF NOT EXISTS comments TEXT;

-- 2. Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';

-- ✅ Listo! Ahora los pedidos pueden tener comentarios individuales.
