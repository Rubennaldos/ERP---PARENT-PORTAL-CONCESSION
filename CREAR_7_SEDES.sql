-- ============================================
-- CREAR LAS 7 SEDES DE LIMA CAFÉ 28
-- ============================================
-- Ejecutar en: Supabase SQL Editor

-- 1. Limpiar sedes anteriores (opcional, solo si quieres empezar desde cero)
-- DELETE FROM schools WHERE code IN ('NRD', 'SGV', 'SGM', 'LSG', 'JLB', 'MC1', 'MC2');

-- 2. Crear las 7 sedes
INSERT INTO schools (id, name, code, created_at) VALUES
(gen_random_uuid(), 'Nordic', 'NRD', now()),
(gen_random_uuid(), 'Saint George Villa', 'SGV', now()),
(gen_random_uuid(), 'Saint George Miraflores', 'SGM', now()),
(gen_random_uuid(), 'Little Saint George', 'LSG', now()),
(gen_random_uuid(), 'Jean LeBouch', 'JLB', now()),
(gen_random_uuid(), 'Maristas Champagnat 1', 'MC1', now()),
(gen_random_uuid(), 'Maristas Champagnat 2', 'MC2', now());

-- 3. Verificar que se crearon correctamente
SELECT * FROM schools ORDER BY name;

-- ============================================
-- RESULTADO ESPERADO: 7 filas
-- ============================================
-- Nordic (NRD)
-- Saint George Villa (SGV)
-- Saint George Miraflores (SGM)
-- Little Saint George (LSG)
-- Jean LeBouch (JLB)
-- Maristas Champagnat 1 (MC1)
-- Maristas Champagnat 2 (MC2)
-- ============================================

-- 4. (OPCIONAL) Ver los IDs para crear usuarios después
SELECT 
  name as "Nombre Sede",
  code as "Código",
  id as "UUID (para asignar usuarios)"
FROM schools 
ORDER BY name;

