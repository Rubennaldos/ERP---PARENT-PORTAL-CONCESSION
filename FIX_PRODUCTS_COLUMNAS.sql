-- ============================================
-- FIX: Agregar columnas faltantes a products
-- Maracuyá - Villagratia Dei College
-- ============================================
-- Ejecutar en: Supabase SQL Editor

-- 1. Agregar todas las columnas que el código necesita
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_stock BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_initial INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_sale DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS school_ids UUID[];

-- 2. Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;
