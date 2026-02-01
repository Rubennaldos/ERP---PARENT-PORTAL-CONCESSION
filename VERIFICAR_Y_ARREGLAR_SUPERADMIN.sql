-- ============================================
-- VERIFICAR Y ARREGLAR SUPERADMIN
-- ============================================

-- 1. VERIFICAR si tu superadmin existe en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'adminlsg@ejemplo.com';

-- 2. VERIFICAR si existe en profiles y su rol
SELECT 
  p.id,
  p.email,
  p.role,
  p.full_name,
  p.school_id,
  p.created_at
FROM public.profiles p
WHERE p.email = 'adminlsg@ejemplo.com';

-- 3. VERIFICAR la relación completa (join)
SELECT 
  u.id as user_id,
  u.email as auth_email,
  u.created_at as auth_created,
  p.email as profile_email,
  p.role,
  p.full_name,
  p.school_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'adminlsg@ejemplo.com';

-- ============================================
-- SI EXISTE PERO NO TIENE ROL CORRECTO:
-- ============================================

-- 4. ARREGLAR el rol (solo si existe el usuario)
UPDATE public.profiles
SET 
  role = 'admin_general',
  school_id = NULL,
  full_name = COALESCE(full_name, 'Super Admin')
WHERE email = 'adminlsg@ejemplo.com';

-- ============================================
-- VERIFICAR EL EMAIL PROBLEMÁTICO
-- ============================================

-- 5. Verificar si 'adminisg@limacafe28.com' está bloqueando
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'adminisg@limacafe28.com';

-- ============================================
-- SI NECESITAS BORRAR 'adminisg@limacafe28.com'
-- ============================================

-- 6. SOLO si existe y quieres borrarlo completamente:
-- (Ejecuta estos en orden SOLO si el paso 5 devuelve resultados)

-- Primero borra de profiles
DELETE FROM public.profiles 
WHERE email = 'adminisg@limacafe28.com';

-- Luego borra de auth.users
DELETE FROM auth.users 
WHERE email = 'adminisg@limacafe28.com';

-- ============================================
-- RESULTADO FINAL
-- ============================================

-- 7. Ver todos los usuarios para confirmar
SELECT 
  u.email,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
