-- ============================================================================
-- 🍈 MARACUYÁ TIENDAS Y CONCESIONARIAS SALUDABLES
-- SETUP COMPLETO DE BASE DE DATOS DESDE CERO
-- ============================================================================
-- Ejecutar en Supabase SQL Editor del proyecto: bezduattsdrepvpwjqgv
-- URL: https://supabase.com/dashboard/project/bezduattsdrepvpwjqgv/sql
-- ============================================================================
-- ⚠️ EJECUTAR EN ORDEN: Copiar y pegar FASE por FASE
-- ============================================================================

-- ============================================================================
-- FASE 0: EXTENSIONES Y TABLA PROFILES (REQUERIDA PRIMERO)
-- ============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla profiles (núcleo del sistema - vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'parent' CHECK (role IN (
    'superadmin', 'admin_general', 'gestor_unidad', 'almacenero',
    'operador_caja', 'operador_cocina', 'supervisor_red', 'parent', 'teacher', 'contadora'
  )),
  school_id UUID,
  custom_schools UUID[],
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar admin sin recursión
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin_general', 'superadmin')
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

-- RLS para profiles
CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_superadmin_all" ON public.profiles FOR ALL USING (public.check_is_superadmin());
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT USING (public.check_is_admin());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Trigger: cuando se registra un usuario, crear profile automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'parent')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FASE 1: TABLAS BASE (schools, students, products, transactions)
-- ============================================================================

-- Tabla schools (Sedes/Colegios)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(200),
  warehouse_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver colegios" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Admins gestionan colegios" ON public.schools FOR ALL USING (public.check_is_admin());

-- Agregar FK de profiles a schools
ALTER TABLE public.profiles ADD CONSTRAINT profiles_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;

-- Tabla students (Estudiantes)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.profiles(id),
  full_name VARCHAR(200) NOT NULL,
  name VARCHAR(200), -- legacy
  photo_url TEXT,
  balance DECIMAL(10,2) DEFAULT 0.00,
  daily_limit DECIMAL(10,2) DEFAULT 10.00,
  weekly_limit DECIMAL(10,2),
  monthly_limit DECIMAL(10,2),
  limit_type VARCHAR(20) DEFAULT 'daily',
  grade VARCHAR(50),
  section VARCHAR(50),
  school_id UUID REFERENCES public.schools(id),
  level_id UUID,
  classroom_id UUID,
  free_account BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_admin_all" ON public.students FOR ALL USING (public.check_is_admin());
CREATE POLICY "students_staff_select" ON public.students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('superadmin', 'admin_general', 'gestor_unidad', 'operador_caja', 'operador_cocina', 'supervisor_red')
  )
);
CREATE POLICY "students_parent_select" ON public.students FOR SELECT USING (parent_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

-- Tabla products (Productos)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  code VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  price_sale DECIMAL(10,2),
  price_cost DECIMAL(10,2),
  category VARCHAR(50),
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  school_ids UUID[],
  is_available BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_admin_all" ON public.products FOR ALL USING (public.check_is_admin());
CREATE POLICY "products_public_select" ON public.products FOR SELECT TO authenticated USING (true);

-- Tabla transactions (Transacciones/Ventas)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id),
  teacher_id UUID,
  school_id UUID REFERENCES public.schools(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  balance_after DECIMAL(10,2),
  payment_method VARCHAR(50) DEFAULT 'efectivo',
  payment_status VARCHAR(50) DEFAULT 'paid',
  ticket_code VARCHAR(50),
  manual_client_name VARCHAR(200),
  metadata JSONB,
  -- Campos para pagos mixtos
  paid_with_mixed BOOLEAN DEFAULT false,
  cash_amount DECIMAL(10,2) DEFAULT 0,
  card_amount DECIMAL(10,2) DEFAULT 0,
  yape_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_school_id ON transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Tabla transaction_items (Items de cada venta)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name VARCHAR(200),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);

-- Ticket sequences (para generar códigos de ticket)
CREATE TABLE IF NOT EXISTS public.ticket_sequences (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id),
  last_number INTEGER DEFAULT 0
);

-- Función para generar ticket codes
CREATE OR REPLACE FUNCTION get_next_ticket_number(p_school_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_next_number INTEGER;
  v_school_code TEXT;
BEGIN
  INSERT INTO ticket_sequences (school_id, last_number)
  VALUES (p_school_id, 1)
  ON CONFLICT (school_id) DO UPDATE SET last_number = ticket_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;

  SELECT UPPER(code) INTO v_school_code FROM schools WHERE id = p_school_id;
  RETURN COALESCE(v_school_code, 'SEDE') || '-' || LPAD(v_next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FASE 2: PARENT PROFILES Y TEACHER PROFILES
-- ============================================================================

-- Tabla parent_profiles
CREATE TABLE IF NOT EXISTS public.parent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  full_name VARCHAR(200),
  dni VARCHAR(20),
  address TEXT,
  phone_1 VARCHAR(15),
  phone_2 VARCHAR(15),
  phone_1_verified BOOLEAN DEFAULT false,
  phone_2_verified BOOLEAN DEFAULT false,
  payment_responsible BOOLEAN DEFAULT true,
  terms_accepted_at TIMESTAMP,
  terms_version VARCHAR(20),
  onboarding_completed BOOLEAN DEFAULT false,
  approved_by_admin BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parents_self_all" ON public.parent_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "parents_admin_all" ON public.parent_profiles FOR ALL USING (public.check_is_admin());
CREATE POLICY "parents_staff_select" ON public.parent_profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('superadmin', 'admin_general', 'gestor_unidad', 'operador_caja', 'supervisor_red')
  )
);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_user ON parent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_profiles_school ON parent_profiles(school_id);

-- Tabla teacher_profiles
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  dni VARCHAR(20) UNIQUE,
  corporate_email VARCHAR(255),
  personal_email VARCHAR(255),
  phone_1 VARCHAR(20),
  corporate_phone VARCHAR(20),
  area VARCHAR(50),
  school_id_1 UUID REFERENCES public.schools(id),
  school_id_2 UUID REFERENCES public.schools(id),
  balance DECIMAL(10,2) DEFAULT 0.00,
  free_account BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers view own profile" ON public.teacher_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Teachers update own profile" ON public.teacher_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all teachers" ON public.teacher_profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin_general', 'operador_caja', 'gestor_unidad', 'supervisor_red')
  )
);
CREATE POLICY "Admins create teachers" ON public.teacher_profiles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin_general')
  )
);
CREATE POLICY "Admins delete teachers" ON public.teacher_profiles FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin_general')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO authenticated;

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school_id_1 ON public.teacher_profiles(school_id_1);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school_id_2 ON public.teacher_profiles(school_id_2);

-- ============================================================================
-- FASE 3: PRECIOS POR SEDE Y GRADOS/SALONES
-- ============================================================================

-- Precios por sede
CREATE TABLE IF NOT EXISTS public.product_school_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  price_sale DECIMAL(10,2) NOT NULL,
  price_cost DECIMAL(10,2),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, school_id)
);

ALTER TABLE product_school_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psp_admin_all" ON product_school_prices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'supervisor_red'))
);
CREATE POLICY "psp_staff_select" ON product_school_prices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('gestor_unidad', 'operador_caja'))
);

-- Grados/Niveles
CREATE TABLE IF NOT EXISTS public.school_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, name)
);

ALTER TABLE school_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels_view" ON school_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "levels_manage" ON school_levels FOR ALL TO authenticated USING (public.check_is_admin());

-- Aulas/Secciones
CREATE TABLE IF NOT EXISTS public.school_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.school_levels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, level_id, name)
);

ALTER TABLE school_classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classrooms_view" ON school_classrooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "classrooms_manage" ON school_classrooms FOR ALL TO authenticated USING (public.check_is_admin());

-- Agregar FK a students
ALTER TABLE public.students 
  ADD CONSTRAINT students_level_fk FOREIGN KEY (level_id) REFERENCES public.school_levels(id) ON DELETE SET NULL,
  ADD CONSTRAINT students_classroom_fk FOREIGN KEY (classroom_id) REFERENCES public.school_classrooms(id) ON DELETE SET NULL;

-- ============================================================================
-- FASE 4: SISTEMA DE ALMUERZOS (categories, menus, orders, addons)
-- ============================================================================

-- Categorías de almuerzo
CREATE TABLE IF NOT EXISTS lunch_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_type VARCHAR(20) NOT NULL DEFAULT 'students' CHECK (target_type IN ('students', 'teachers', 'both')),
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'utensils',
  price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  is_kitchen_sale BOOLEAN DEFAULT false,
  allows_addons BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lunch_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_view" ON lunch_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "lc_manage" ON lunch_categories FOR ALL TO authenticated USING (public.check_is_admin());

-- Menús de almuerzo
CREATE TABLE IF NOT EXISTS lunch_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category_id UUID REFERENCES lunch_categories(id) ON DELETE SET NULL,
  target_type VARCHAR(20) DEFAULT 'students',
  main_course TEXT,
  side_dish TEXT,
  dessert TEXT,
  drink TEXT,
  starter TEXT,
  notes TEXT,
  beverage TEXT,
  is_special_day BOOLEAN DEFAULT false,
  special_day_type TEXT,
  special_day_title TEXT,
  is_kitchen_product BOOLEAN DEFAULT false,
  product_name VARCHAR(200),
  product_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lunch_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lm_view" ON lunch_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "lm_manage" ON lunch_menus FOR ALL TO authenticated USING (public.check_is_admin());

CREATE INDEX IF NOT EXISTS idx_lunch_menus_school_date ON lunch_menus(school_id, date);
CREATE INDEX IF NOT EXISTS idx_lunch_menus_category ON lunch_menus(category_id);

-- Pedidos de almuerzo
CREATE TABLE IF NOT EXISTS public.lunch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID,
  manual_name VARCHAR(200),
  school_id UUID REFERENCES schools(id),
  order_date DATE NOT NULL,
  category_id UUID REFERENCES lunch_categories(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  base_price DECIMAL(10,2) DEFAULT 0,
  addons_total DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  status TEXT NOT NULL DEFAULT 'pending',
  is_cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.lunch_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lo_parent_select" ON lunch_orders FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
);
CREATE POLICY "lo_parent_insert" ON lunch_orders FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
);
CREATE POLICY "lo_admin_all" ON lunch_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'supervisor_red', 'gestor_unidad', 'operador_caja', 'operador_cocina'))
);
CREATE POLICY "lo_teacher_select" ON lunch_orders FOR SELECT USING (teacher_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_lunch_orders_student_id ON lunch_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_date ON lunch_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_school ON lunch_orders(school_id);

-- Addons de almuerzo
CREATE TABLE IF NOT EXISTS lunch_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lunch_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "la_view" ON lunch_addons FOR SELECT TO authenticated USING (true);
CREATE POLICY "la_manage" ON lunch_addons FOR ALL TO authenticated USING (public.check_is_admin());

-- Category addons
CREATE TABLE IF NOT EXISTS lunch_category_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES lunch_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE lunch_category_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lca_view" ON lunch_category_addons FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "lca_manage" ON lunch_category_addons FOR ALL TO authenticated USING (public.check_is_admin());

-- Order addons
CREATE TABLE IF NOT EXISTS lunch_order_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES lunch_orders(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES lunch_category_addons(id),
  addon_name VARCHAR(100) NOT NULL,
  addon_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lunch_order_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loa_admin_view" ON lunch_order_addons FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'gestor_unidad', 'operador_caja'))
);
CREATE POLICY "loa_admin_manage" ON lunch_order_addons FOR ALL TO authenticated USING (public.check_is_admin());

-- ============================================================================
-- FASE 5: CAJA REGISTRADORA
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES profiles(id),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  expected_amount DECIMAL(10,2) DEFAULT 0,
  actual_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  admin_password_validated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_staff" ON cash_registers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'gestor_unidad', 'operador_caja'))
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso', 'ajuste')),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  responsible_name VARCHAR(255) NOT NULL,
  responsible_id UUID REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  requires_signature BOOLEAN DEFAULT true,
  signature_validated BOOLEAN DEFAULT false,
  voucher_printed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_staff" ON cash_movements FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'gestor_unidad', 'operador_caja'))
);

CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  closure_date DATE NOT NULL,
  pos_cash DECIMAL(10,2) DEFAULT 0,
  pos_card DECIMAL(10,2) DEFAULT 0,
  pos_yape DECIMAL(10,2) DEFAULT 0,
  pos_credit DECIMAL(10,2) DEFAULT 0,
  pos_total DECIMAL(10,2) DEFAULT 0,
  lunch_cash DECIMAL(10,2) DEFAULT 0,
  lunch_credit DECIMAL(10,2) DEFAULT 0,
  lunch_total DECIMAL(10,2) DEFAULT 0,
  total_cash DECIMAL(10,2) DEFAULT 0,
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_ingresos DECIMAL(10,2) DEFAULT 0,
  total_egresos DECIMAL(10,2) DEFAULT 0,
  initial_amount DECIMAL(10,2) DEFAULT 0,
  expected_final DECIMAL(10,2) DEFAULT 0,
  actual_final DECIMAL(10,2) DEFAULT 0,
  difference DECIMAL(10,2) DEFAULT 0,
  closed_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_staff" ON cash_closures FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'gestor_unidad', 'operador_caja'))
);

CREATE TABLE IF NOT EXISTS cash_register_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  auto_close_enabled BOOLEAN DEFAULT false,
  auto_close_time TIME DEFAULT '18:00:00',
  whatsapp_phone VARCHAR(20),
  require_admin_password BOOLEAN DEFAULT true,
  alert_on_difference BOOLEAN DEFAULT true,
  difference_threshold DECIMAL(10,2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_register_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crc_staff" ON cash_register_config FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'gestor_unidad', 'operador_caja'))
);

-- ============================================================================
-- FASE 6: RECARGAS, PERMISOS Y FACTURACIÓN
-- ============================================================================

-- Recharge Requests
CREATE TABLE IF NOT EXISTS recharge_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id),
  school_id UUID REFERENCES schools(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  reference_code TEXT,
  voucher_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  request_type TEXT DEFAULT 'recharge',
  description TEXT,
  lunch_order_ids UUID[],
  paid_transaction_ids UUID[],
  rejection_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES transactions(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_all" ON recharge_requests FOR ALL TO authenticated USING (true);

-- Modules (Sistema de permisos)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  route VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'functional' CHECK (status IN ('functional', 'coming_soon')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_view" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_manage" ON modules FOR ALL TO authenticated USING (public.check_is_admin());

-- Module Actions
CREATE TABLE IF NOT EXISTS module_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL REFERENCES modules(code) ON DELETE CASCADE,
  action_code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, action_code)
);

ALTER TABLE module_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_view" ON module_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ma_manage" ON module_actions FOR ALL TO authenticated USING (public.check_is_admin());

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  module_code VARCHAR(50) NOT NULL REFERENCES modules(code) ON DELETE CASCADE,
  action_code VARCHAR(50) NOT NULL,
  can_access BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_code, action_code),
  FOREIGN KEY (module_code, action_code) REFERENCES module_actions(module_code, action_code) ON DELETE CASCADE
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp_view" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp_manage" ON role_permissions FOR ALL TO authenticated USING (public.check_is_admin());

-- Billing Config
CREATE TABLE IF NOT EXISTS billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  yape_number VARCHAR(20),
  yape_holder VARCHAR(200),
  plin_number VARCHAR(20),
  plin_holder VARCHAR(200),
  bank_info TEXT,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_cci VARCHAR(50),
  bank_holder VARCHAR(200),
  message_template TEXT,
  business_name VARCHAR(200),
  business_ruc VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE billing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_view" ON billing_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "bc_manage" ON billing_config FOR ALL TO authenticated USING (public.check_is_admin());

-- ============================================================================
-- FASE 7: RLS para TRANSACTIONS (completa)
-- ============================================================================

CREATE POLICY "tx_admin_all" ON transactions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_general', 'superadmin', 'supervisor_red'))
);
CREATE POLICY "tx_staff_by_school" ON transactions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('gestor_unidad', 'operador_caja') AND profiles.school_id = transactions.school_id)
);
CREATE POLICY "tx_parent_select" ON transactions FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
);
CREATE POLICY "tx_teacher_select" ON transactions FOR SELECT USING (teacher_id = auth.uid());

-- RLS para transaction_items
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ti_all" ON transaction_items FOR ALL TO authenticated USING (true);

-- ============================================================================
-- FASE 8: INSERTAR MÓDULOS DEL SISTEMA
-- ============================================================================

INSERT INTO modules (code, name, description, icon, color, route, is_active, status, display_order) VALUES
  ('pos', 'Punto de Venta', 'Sistema de cobro y ventas', 'ShoppingCart', 'blue', '/pos', true, 'functional', 1),
  ('ventas', 'Lista de Ventas', 'Historial y reportes de ventas', 'FileSearch', 'purple', '/sales', true, 'functional', 2),
  ('cobranzas', 'Cobranzas', 'Gestión de cuentas por cobrar', 'DollarSign', 'red', '/cobranzas', true, 'functional', 3),
  ('almuerzos', 'Comedor', 'Gestión de almuerzos escolares', 'UtensilsCrossed', 'yellow', '/comedor', true, 'functional', 4),
  ('productos', 'Productos', 'Catálogo de productos y precios', 'Package', 'indigo', '/products', true, 'functional', 5),
  ('admin_sede', 'Administración de Sede', 'Gestión de la sede', 'ShieldCheck', 'orange', '/school-admin', true, 'functional', 6),
  ('finanzas', 'Finanzas y Tesorería', 'Efectivo por sede', 'LineChart', 'emerald', '/finanzas', true, 'functional', 7),
  ('cierre_caja', 'Cierre de Caja', 'Gestión de caja diaria', 'DollarSign', 'green', '/cash-register', true, 'functional', 8),
  ('config_padres', 'Configuración Padres', 'Gestión de padres y estudiantes', 'Users', 'pink', '/parents', true, 'functional', 9),
  ('promociones', 'Combos y Promociones', 'Gestión de combos', 'TrendingUp', 'red', '/combos-promotions', true, 'functional', 10),
  ('logistica', 'Logística', 'Inventario y compras', 'Package', 'orange', '/logistics', true, 'coming_soon', 11)
ON CONFLICT (code) DO NOTHING;

-- Acciones por módulo
INSERT INTO module_actions (module_code, action_code, name, description) VALUES
  ('pos', 'ver_modulo', 'Ver módulo', 'Acceder al punto de venta'),
  ('pos', 'realizar_venta', 'Realizar venta', 'Procesar ventas'),
  ('ventas', 'ver_modulo', 'Ver módulo', 'Acceder a lista de ventas'),
  ('ventas', 'ver_ventas', 'Ver ventas', 'Ver lista de ventas'),
  ('cobranzas', 'ver_modulo', 'Ver módulo', 'Acceder a cobranzas'),
  ('cobranzas', 'ver_deudas', 'Ver deudas', 'Ver cuentas por cobrar'),
  ('almuerzos', 'ver_modulo', 'Ver módulo', 'Acceder al comedor'),
  ('almuerzos', 'registrar_almuerzo', 'Registrar almuerzo', 'Registrar consumo'),
  ('productos', 'ver_modulo', 'Ver módulo', 'Acceder a productos'),
  ('productos', 'crear_producto', 'Crear producto', 'Agregar productos'),
  ('admin_sede', 'ver_modulo', 'Ver módulo', 'Acceder a admin sede'),
  ('finanzas', 'ver_modulo', 'Ver módulo', 'Acceder a finanzas'),
  ('cierre_caja', 'ver_modulo', 'Ver módulo', 'Acceder a cierre de caja'),
  ('cierre_caja', 'abrir_caja', 'Abrir caja', 'Abrir caja del día'),
  ('cierre_caja', 'cerrar_caja', 'Cerrar caja', 'Cerrar caja del día'),
  ('config_padres', 'ver_modulo', 'Ver módulo', 'Acceder a config padres'),
  ('promociones', 'ver_modulo', 'Ver módulo', 'Acceder a promociones'),
  ('logistica', 'ver_modulo', 'Ver módulo', 'Acceder a logística')
ON CONFLICT (module_code, action_code) DO NOTHING;

-- Permisos por defecto para operador_caja
INSERT INTO role_permissions (role, module_code, action_code, can_access) VALUES
  ('operador_caja', 'pos', 'ver_modulo', true),
  ('operador_caja', 'pos', 'realizar_venta', true),
  ('operador_caja', 'ventas', 'ver_modulo', true),
  ('operador_caja', 'ventas', 'ver_ventas', true),
  ('operador_caja', 'cierre_caja', 'ver_modulo', true),
  ('operador_caja', 'cierre_caja', 'abrir_caja', true),
  ('operador_caja', 'cierre_caja', 'cerrar_caja', true),
  ('operador_caja', 'almuerzos', 'ver_modulo', true),
  ('operador_caja', 'almuerzos', 'registrar_almuerzo', true),
  ('operador_caja', 'cobranzas', 'ver_modulo', true)
ON CONFLICT (role, module_code, action_code) DO NOTHING;

-- Permisos para gestor_unidad
INSERT INTO role_permissions (role, module_code, action_code, can_access) VALUES
  ('gestor_unidad', 'pos', 'ver_modulo', true),
  ('gestor_unidad', 'pos', 'realizar_venta', true),
  ('gestor_unidad', 'ventas', 'ver_modulo', true),
  ('gestor_unidad', 'ventas', 'ver_ventas', true),
  ('gestor_unidad', 'cobranzas', 'ver_modulo', true),
  ('gestor_unidad', 'cobranzas', 'ver_deudas', true),
  ('gestor_unidad', 'almuerzos', 'ver_modulo', true),
  ('gestor_unidad', 'almuerzos', 'registrar_almuerzo', true),
  ('gestor_unidad', 'productos', 'ver_modulo', true),
  ('gestor_unidad', 'productos', 'crear_producto', true),
  ('gestor_unidad', 'admin_sede', 'ver_modulo', true),
  ('gestor_unidad', 'cierre_caja', 'ver_modulo', true),
  ('gestor_unidad', 'cierre_caja', 'abrir_caja', true),
  ('gestor_unidad', 'cierre_caja', 'cerrar_caja', true),
  ('gestor_unidad', 'config_padres', 'ver_modulo', true)
ON CONFLICT (role, module_code, action_code) DO NOTHING;

-- Permisos para operador_cocina
INSERT INTO role_permissions (role, module_code, action_code, can_access) VALUES
  ('operador_cocina', 'almuerzos', 'ver_modulo', true),
  ('operador_cocina', 'almuerzos', 'registrar_almuerzo', true)
ON CONFLICT (role, module_code, action_code) DO NOTHING;

-- ============================================================================
-- FASE 9: STORAGE BUCKETS
-- ============================================================================

-- Crear buckets de storage
INSERT INTO storage.buckets (id, name, public) VALUES ('vouchers', 'vouchers', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true) ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para vouchers
CREATE POLICY "vouchers_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vouchers');
CREATE POLICY "vouchers_auth_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vouchers');
CREATE POLICY "vouchers_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vouchers');

-- Políticas para school-assets (público)
CREATE POLICY "school_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "school_assets_admin_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'school-assets');

-- Políticas para student-photos (público lectura, auth escritura)
CREATE POLICY "student_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');
CREATE POLICY "student_photos_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-photos');
CREATE POLICY "student_photos_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'student-photos');

-- ============================================================================
-- FASE 10: FUNCIÓN DE VALIDACIÓN DE CONTRASEÑA ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_admin_password(p_user_id UUID, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE id = p_user_id
  AND encrypted_password = crypt(p_password, encrypted_password);
  
  RETURN v_user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar límites de gasto
CREATE OR REPLACE FUNCTION check_student_spending_limit(
  p_student_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_student RECORD;
  v_spent_today DECIMAL;
  v_spent_week DECIMAL;
  v_spent_month DECIMAL;
  v_result JSONB;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Estudiante no encontrado');
  END IF;

  IF v_student.free_account = true THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'Cuenta libre');
  END IF;

  -- Gasto del día
  SELECT COALESCE(SUM(amount), 0) INTO v_spent_today
  FROM transactions
  WHERE student_id = p_student_id
  AND type = 'purchase'
  AND DATE(created_at) = CURRENT_DATE;

  IF v_student.limit_type = 'daily' AND v_student.daily_limit IS NOT NULL THEN
    IF (v_spent_today + p_amount) > v_student.daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Límite diario excedido',
        'limit', v_student.daily_limit,
        'spent', v_spent_today
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'spent_today', v_spent_today);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ✅ SETUP COMPLETO - BASE DE DATOS LISTA PARA MARACUYÁ
-- ============================================================================

SELECT '✅ Base de datos Maracuyá configurada correctamente' as status;
SELECT COUNT(*) as total_tablas FROM information_schema.tables WHERE table_schema = 'public';
SELECT COUNT(*) as total_modulos FROM modules;
