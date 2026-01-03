-- =====================================================
-- RENOMBRAR ROL: kitchen → comedor
-- Desarrollado por ARQUISIA para Lima Café 28
-- Fecha: 04 de Enero 2026
-- =====================================================

-- 1. Actualizar todos los usuarios con rol 'kitchen' a 'comedor'
UPDATE profiles
SET role = 'comedor'
WHERE role = 'kitchen';

-- 2. Verificar cambios
SELECT 
  id,
  email,
  role,
  school_id,
  created_at
FROM profiles
WHERE role = 'comedor'
ORDER BY created_at DESC;

-- =====================================================
-- ✅ SCRIPT COMPLETADO
-- Ejecuta este script en Supabase SQL Editor
-- =====================================================

