-- ============================================================================
-- RESETEO TOTAL PARA PRODUCCIÓN (LIMA CAFÉ 28)
-- ============================================================================

-- 1. DESACTIVAR TRIGGERS TEMPORALMENTE
SET session_replication_role = 'replica';

-- 2. LIMPIEZA TOTAL DE TABLAS DE NEGOCIO (TRUNCATE)
-- Esto borra TODO el contenido pero mantiene la estructura
TRUNCATE TABLE public.lunch_orders CASCADE;
TRUNCATE TABLE public.students CASCADE;
TRUNCATE TABLE public.products CASCADE;
-- TRUNCATE TABLE public.categories CASCADE; -- Descomentar si tienes esta tabla
-- TRUNCATE TABLE public.transactions CASCADE; -- Descomentar si tienes esta tabla
-- TRUNCATE TABLE public.inventory_history CASCADE; -- Descomentar si tienes esta tabla

-- 3. LIMPIEZA DE PERFILES
-- Borramos todos los perfiles de padres y usuarios
TRUNCATE TABLE public.parent_profiles CASCADE;

-- Borramos todos los perfiles de la tabla profiles EXCEPTO el Super Admin
DELETE FROM public.profiles 
WHERE email != 'superadmin@limacafe28.com';

-- 4. LIMPIEZA DE AUTENTICACIÓN (AUTH.USERS)
-- Esto elimina las cuentas de Google/Microsoft creadas hasta ahora
-- Mantiene solo al Super Admin para que no pierdas acceso
DELETE FROM auth.users 
WHERE email != 'superadmin@limacafe28.com';

-- 5. RE-ACTIVAR TRIGGERS Y CONFIGURAR ROLES
SET session_replication_role = 'origin';

-- Asegurar que el programador sea Super Admin
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'superadmin@limacafe28.com';

-- 6. REPARAR RLS SIN RECURSIÓN (ELIMINAR ERROR 500)
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

-- 7. APLICAR POLÍTICAS LIMPIAS
DO $$
DECLARE
  tab RECORD;
  pol RECORD;
BEGIN
  FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = tab.tablename AND schemaname = 'public') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tab.tablename);
    END LOOP;
  END LOOP;
END $$;

-- POLÍTICAS BÁSICAS DE SEGURIDAD
-- Profiles
CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_superadmin_all" ON public.profiles FOR ALL USING (public.check_is_superadmin());
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT USING (public.check_is_admin());

-- Parent Profiles
CREATE POLICY "parents_self_all" ON public.parent_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "parents_admin_all" ON public.parent_profiles FOR ALL USING (public.check_is_admin());

-- Students
CREATE POLICY "students_admin_all" ON public.students FOR ALL USING (public.check_is_admin());
CREATE POLICY "students_parent_select" ON public.students FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.parent_profiles 
    WHERE user_id = auth.uid() 
    AND (school_id IS NULL OR school_id = students.school_id)
  )
);

-- Products
CREATE POLICY "products_admin_all" ON public.products FOR ALL USING (public.check_is_admin());
CREATE POLICY "products_public_select" ON public.products FOR SELECT TO authenticated USING (true);

-- 8. TRIGGER DE REGISTRO AUTOMÁTICO (PADRES POR DEFECTO)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
