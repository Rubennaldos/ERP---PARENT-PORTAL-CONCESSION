-- =====================================================
-- INVESTIGAR QUÉ CONTIENE created_by Y CÓMO OBTENER EL ROL
-- =====================================================

-- 1️⃣ Ver ejemplos de created_by en transactions
SELECT 
  '🔍 EJEMPLOS DE created_by' as tipo,
  id,
  created_by,
  description,
  created_at
FROM transactions
WHERE payment_status = 'paid'
  AND created_by IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2️⃣ Ver si existe ese created_by en profiles
WITH recent_transactions AS (
  SELECT DISTINCT created_by
  FROM transactions
  WHERE payment_status = 'paid'
    AND created_by IS NOT NULL
  LIMIT 5
)
SELECT 
  '👤 USUARIOS EN PROFILES' as tipo,
  p.id,
  p.full_name,
  p.email,
  p.role,
  CASE 
    WHEN rt.created_by IS NOT NULL THEN '✅ Encontrado'
    ELSE '❌ No encontrado'
  END as estado
FROM profiles p
INNER JOIN recent_transactions rt ON p.id = rt.created_by;

-- 3️⃣ Ver estructura de la tabla profiles
SELECT 
  '📋 COLUMNAS DE PROFILES' as tipo,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4️⃣ Ver si hay una tabla de user_permissions o similar
SELECT 
  '🔐 PERMISOS DE USUARIO (si existe)' as tipo,
  up.*
FROM user_permissions up
WHERE up.user_id IN (
  SELECT DISTINCT created_by
  FROM transactions
  WHERE payment_status = 'paid'
    AND created_by IS NOT NULL
  LIMIT 3
)
LIMIT 10;
