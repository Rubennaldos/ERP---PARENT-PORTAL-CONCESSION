-- ============================================
-- LIMPIAR USUARIOS HUÉRFANOS Y VERIFICAR DATOS
-- ============================================

-- 1. VERIFICAR si existe el email en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  deleted_at
FROM auth.users
WHERE email = 'adminisg@limacafe28.com';

-- 2. VERIFICAR si existe en profiles (puede estar huérfano)
SELECT 
  id,
  email,
  role,
  school_id,
  created_at
FROM public.profiles
WHERE email = 'adminisg@limacafe28.com';

-- 3. BUSCAR TODOS los usuarios con emails similares (por si hay typos)
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.school_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email ILIKE '%admin%'
ORDER BY u.created_at DESC;

-- ============================================
-- LIMPIAR REGISTROS HUÉRFANOS
-- ============================================

-- 4. ELIMINAR profiles que NO tienen usuario en auth.users
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- 5. ELIMINAR parent_profiles huérfanos
DELETE FROM public.parent_profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 6. ELIMINAR teacher_profiles huérfanos (usa 'id' en lugar de 'user_id')
DELETE FROM public.teacher_profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- VERIFICAR TU SUPERADMIN
-- ============================================

-- 7. BUSCAR tu superadmin (debe tener rol admin_general)
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.school_id,
  p.full_name
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.role = 'admin_general'
ORDER BY u.created_at DESC;

-- 8. Si NO encuentras tu superadmin, verifica TODOS los usuarios
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;

-- ============================================
-- SOLUCIÓN: ELIMINAR COMPLETAMENTE UN EMAIL
-- ============================================

-- 9. Si necesitas BORRAR COMPLETAMENTE un email específico:
-- (Ejecuta estos en orden, reemplaza el email)

-- Primero, obtén el ID del usuario
SELECT id FROM auth.users WHERE email = 'adminisg@limacafe28.com';

-- Luego, borra de todas las tablas relacionadas
-- (Reemplaza 'USER_ID_AQUI' con el ID que obtuviste arriba)

DELETE FROM public.parent_profiles WHERE user_id = 'USER_ID_AQUI';
DELETE FROM public.teacher_profiles WHERE id = 'USER_ID_AQUI';
DELETE FROM public.profiles WHERE id = 'USER_ID_AQUI';
-- Finalmente, borra de auth.users (IMPORTANTE: esto debe ser último)
DELETE FROM auth.users WHERE id = 'USER_ID_AQUI';

-- ============================================
-- RECREAR TU SUPERADMIN (si se borró)
-- ============================================

-- 10. Si borraste tu superadmin, puedes crearlo manualmente:
-- Ve a Authentication -> Users en Supabase Dashboard
-- Click "Add user" -> "Create new user"
-- Email: tu_email@ejemplo.com
-- Password: (tu contraseña segura)

-- Luego ejecuta esto para asignarle el rol (reemplaza el email):
UPDATE public.profiles
SET role = 'admin_general',
    full_name = 'Super Admin',
    school_id = NULL
WHERE email = 'TU_EMAIL_AQUI@ejemplo.com';

-- ============================================
-- VERIFICAR RESULTADO FINAL
-- ============================================

-- 11. Verificar que todo esté limpio
SELECT 
  'auth.users' as tabla,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'profiles' as tabla,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'profiles sin auth' as tabla,
  COUNT(*) as total
FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Ejecuta los scripts en orden
-- 2. Los pasos 1-3 son solo para VERIFICAR (no borran nada)
-- 3. Los pasos 4-6 LIMPIAN registros huérfanos
-- 4. El paso 9 es para BORRAR COMPLETAMENTE un usuario específico
-- 5. Después de limpiar, intenta crear el usuario de nuevo desde el formulario
