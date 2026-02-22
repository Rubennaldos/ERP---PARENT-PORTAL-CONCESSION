-- ============================================
-- FIX: Agregar columnas faltantes a profiles
-- Maracuyá - Villagratia Dei College
-- ============================================
-- Ejecutar en: Supabase SQL Editor
-- https://supabase.com/dashboard/project/bezduattsdrepvpwjqgv/sql/new

-- 1. Agregar columnas faltantes a profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pos_number INTEGER,
  ADD COLUMN IF NOT EXISTS ticket_prefix VARCHAR(20),
  ADD COLUMN IF NOT EXISTS dni VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone_1 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

-- 2. Verificar que la tabla profiles tiene todas las columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- RESULTADO ESPERADO: Deberías ver estas columnas:
-- id, email, full_name, role, school_id, custom_schools,
-- avatar_url, created_at, updated_at, pos_number, 
-- ticket_prefix, dni, phone_1, address, nickname
-- ============================================
