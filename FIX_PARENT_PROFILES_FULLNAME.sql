-- =========================================
-- FIX: Hacer full_name opcional en parent_profiles
-- Problema: El registro falla porque full_name es NOT NULL
-- pero se completa después en el onboarding
-- =========================================

-- Permitir que full_name sea NULL temporalmente (hasta completar onboarding)
ALTER TABLE parent_profiles 
ALTER COLUMN full_name DROP NOT NULL;

-- Verificar
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'parent_profiles' 
AND column_name = 'full_name';

