-- 🔍 DEBUG ESPECÍFICO: cajerojbl@limacafe28.com

-- ===================================================================
-- PASO 1: Ver el perfil completo de este usuario
-- ===================================================================
SELECT 
  '👤 Perfil de cajerojbl' as info,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.school_id,
  p.created_at,
  s.name as sede_nombre,
  s.code as sede_codigo
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'cajerojbl@limacafe28.com';

-- ===================================================================
-- PASO 2: Ver el registro de autenticación
-- ===================================================================
SELECT 
  '🔐 Usuario en auth.users' as info,
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'cajerojbl@limacafe28.com';

-- ===================================================================
-- PASO 3: Verificar que el school_id NO sea NULL
-- ===================================================================
SELECT 
  '⚠️ Diagnóstico' as check_type,
  CASE 
    WHEN p.school_id IS NULL THEN '❌ school_id es NULL - ESTE ES EL PROBLEMA'
    WHEN p.school_id IS NOT NULL THEN '✅ school_id existe: ' || p.school_id
  END as resultado,
  p.school_id,
  s.name as sede_asignada
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'cajerojbl@limacafe28.com';

-- ===================================================================
-- PASO 4: Si es NULL, asignarlo manualmente a Jean LeBouch
-- ===================================================================
UPDATE profiles
SET school_id = '8a0dbd73-0571-4db1-af5c-65f4948c4c98'  -- Jean LeBouch
WHERE email = 'cajerojbl@limacafe28.com'
  AND school_id IS NULL;

-- ===================================================================
-- PASO 5: Verificación final
-- ===================================================================
SELECT 
  '✅ Estado final de cajerojbl' as verificacion,
  p.id,
  p.email,
  p.role,
  p.school_id,
  s.name as sede_final,
  CASE 
    WHEN p.school_id IS NOT NULL THEN '✅ CORRECTO'
    ELSE '❌ SIGUE NULL'
  END as estado
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.email = 'cajerojbl@limacafe28.com';
