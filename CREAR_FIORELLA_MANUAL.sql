-- ============================================================================
-- CREAR ADMIN GENERAL DIRECTAMENTE DESDE SQL
-- ============================================================================

-- 1. DESACTIVAR RLS TEMPORALMENTE
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles DISABLE ROW LEVEL SECURITY;

-- 2. LIMPIAR CUALQUIER RASTRO DE FIORELLA
DELETE FROM auth.users WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.profiles WHERE email = 'fiorella@limacafe28.com';
DELETE FROM public.parent_profiles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'fiorella@limacafe28.com'
);

-- 3. INSERTAR MANUALMENTE EN AUTH.USERS
-- IMPORTANTE: Necesitas ejecutar esto en el SQL Editor con permisos de service_role
-- Para esto, ve a: Supabase Dashboard → SQL Editor → New Query

-- Genera el hash de la contraseña (reemplaza 'TU_CONTRASEÑA' con la contraseña que quieras)
-- NOTA: Supabase usa bcrypt, pero desde SQL no podemos generar el hash fácilmente
-- Mejor usamos un workaround:

-- 4. CREAR USUARIO USANDO ADMIN API (desde el frontend)
-- Como no podemos crear desde SQL directamente, vamos a usar otro método:

-- ALTERNATIVA: Crear el perfil primero y luego el usuario se autocompleta
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generar un UUID aleatorio
  new_user_id := gen_random_uuid();
  
  -- Insertar perfil directamente
  INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
  VALUES (
    new_user_id,
    'fiorella@limacafe28.com',
    'admin_general',
    'Fiorella',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Perfil creado con ID: %', new_user_id;
  RAISE NOTICE 'Ahora ve al Panel de Supabase → Authentication → Users → Invite User';
  RAISE NOTICE 'Email: fiorella@limacafe28.com';
END $$;

-- 5. REACTIVAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

-- 6. RECREAR POLÍTICAS CORRECTAS
DROP POLICY IF EXISTS "temp_allow_all" ON public.profiles;

CREATE POLICY "users_select_own" ON public.profiles 
FOR SELECT USING (id = auth.uid());

CREATE POLICY "superadmin_all" ON public.profiles 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'admin_general')
  )
);

CREATE POLICY "allow_insert_on_signup" ON public.profiles 
FOR INSERT WITH CHECK (true);

-- 7. VERIFICAR
SELECT email, role FROM public.profiles ORDER BY created_at DESC LIMIT 5;
