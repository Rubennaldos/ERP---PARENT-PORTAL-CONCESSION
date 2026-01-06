-- =========================================
-- FIX: Hacer todos los campos opcionales en parent_profiles
-- Problema: El registro falla porque varios campos son NOT NULL
-- pero se completan después en el onboarding
-- =========================================

-- Permitir que estos campos sean NULL temporalmente (hasta completar onboarding)
ALTER TABLE parent_profiles 
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN dni DROP NOT NULL,
ALTER COLUMN phone_1 DROP NOT NULL,
ALTER COLUMN address DROP NOT NULL;

-- Verificar cambios
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'parent_profiles' 
AND column_name IN ('full_name', 'dni', 'phone_1', 'address')
ORDER BY column_name;

-- ✅ Ahora el flujo funciona así:
-- 1. Registro: Crea perfil con solo email y school_id
-- 2. Onboarding: Completa full_name, dni, phone_1, address
-- 3. Guardar: Marca onboarding_completed = true

