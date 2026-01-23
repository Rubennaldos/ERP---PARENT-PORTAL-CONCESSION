-- ============================================================================
-- CREAR A FIORELLA MANUALMENTE (MÉTODO DEFINITIVO)
-- ============================================================================

-- 1. LIMPIAR TODO DE FIORELLA
DELETE FROM auth.users WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.profiles WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.parent_profiles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'fiorella@limacafe28.com'
);

-- 2. VERIFICAR QUE RLS ESTÉ DESACTIVADO
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles DISABLE ROW LEVEL SECURITY;

-- 3. MOSTRAR INSTRUCCIONES
SELECT '
╔════════════════════════════════════════════════════════════════╗
║  INSTRUCCIONES PARA CREAR A FIORELLA DESDE EL PANEL SUPABASE  ║
╚════════════════════════════════════════════════════════════════╝

1. Ve a: Supabase Dashboard → Authentication → Users
2. Click en: "Add User" o "Invite User"  
3. Llena:
   - Email: fiorella@limacafe28.com
   - Password: 123456
   - Auto Confirm User: ✅ ACTIVAR
4. Click en: "Create user"

DESPUÉS de crear el usuario, EJECUTA ESTO:

' as INSTRUCCIONES;

-- 4. QUERY PARA EJECUTAR DESPUÉS DE CREAR EN EL PANEL
-- Copia y pega esto DESPUÉS de crear el usuario desde el panel:

SELECT '-- Ejecuta esto DESPUÉS de crear a Fiorella desde el panel:' as paso_2;

-- Asignar rol de admin_general
UPDATE public.profiles 
SET role = 'admin_general', full_name = 'Fiorella'
WHERE email = 'fiorella@limacafe28.com';

-- Verificar
SELECT email, role, full_name, created_at 
FROM public.profiles 
WHERE email = 'fiorella@limacafe28.com';
