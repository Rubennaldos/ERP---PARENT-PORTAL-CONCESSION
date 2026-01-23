-- ============================================================================
-- SCRIPT DE LIMPIEZA TOTAL PARA SALIDA A PRODUCCIÓN
-- ============================================================================

-- 1. LIMPIAR DATOS DE TRANSACCIONES Y PEDIDOS (Hijos de otras tablas)
TRUNCATE TABLE public.lunch_orders CASCADE;
-- Si tienes una tabla de transacciones de POS, límpiala aquí:
-- TRUNCATE TABLE public.transactions CASCADE; 

-- 2. LIMPIAR DATOS DE ALUMNOS Y PADRES
TRUNCATE TABLE public.students CASCADE;
TRUNCATE TABLE public.parent_profiles CASCADE;

-- 3. LIMPIAR PERFILES (Excepto el SuperAdmin)
-- Borra todos los perfiles que no sean el de superadmin@limacafe28.com
DELETE FROM public.profiles 
WHERE email != 'superadmin@limacafe28.com';

-- 4. ASEGURAR JERARQUÍA DE SUPERADMIN
-- Si el perfil no existe, se creará cuando el superadmin entre, 
-- pero si existe, le damos el poder total:
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'superadmin@limacafe28.com';

-- 5. REPARAR RLS DEFINITIVAMENTE (Sin recursión y con jerarquía)
-- Función para chequear roles sin bucles
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. APLICAR POLÍTICAS LIMPIAS A PROFILES
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_all" ON public.profiles;

-- Cualquiera puede ver su propio perfil
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Superadmin puede hacer TODO
CREATE POLICY "profiles_superadmin_all" ON public.profiles FOR ALL USING (public.check_is_superadmin());
-- Admins pueden ver perfiles (para gestionar padres)
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT USING (public.check_is_admin());

-- 7. REINICIAR TRIGGER DE NUEVOS USUARIOS
-- Esto asegura que cuando un padre se registre, sea 'parent' por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'parent')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.parent_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ELIMINAR USUARIOS DE LA AUTENTICACIÓN (Opcional pero recomendado para limpieza total)
-- Esto desconectará a todos los usuarios actuales excepto al superadmin
-- Nota: Esto solo borra la data de la tabla auth.users que no sea el superadmin
-- DELETE FROM auth.users WHERE email != 'superadmin@limacafe28.com';
