-- ============================================
-- CREAR SEDE ÚNICA: VILLAGRATIA DEI COLLEGE (VGA)
-- Maracuyá Tiendas y Concesionarias Saludables
-- ============================================
-- Ejecutar en: Supabase SQL Editor
-- https://supabase.com/dashboard/project/bezduattsdrepvpwjqgv/sql/new

-- 1. Limpiar cualquier sede anterior (por si acaso)
DELETE FROM schools;

-- 2. Crear la única sede
INSERT INTO schools (id, name, code, address, is_active, created_at) VALUES
(gen_random_uuid(), 'Colegio Villagratia Dei College', 'VGA', 'Lima, Perú', true, now());

-- 3. Verificar
SELECT 
  name as "Sede",
  code as "Código",
  id as "UUID",
  is_active as "Activa"
FROM schools;

-- ============================================
-- RESULTADO ESPERADO: 1 fila
-- Colegio Villagratia Dei College (VGA) ✅
-- ============================================
