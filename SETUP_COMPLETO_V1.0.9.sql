-- =============================================
-- SCRIPT CONSOLIDADO - TODOS LOS CAMBIOS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- ==================
-- 1. FIX CAJERO ROLE
-- ==================
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'parent',
  'superadmin', 
  'admin_general',
  'supervisor_red',
  'gestor_unidad',
  'operador_caja',
  'operador_cocina',
  'pos',
  'comedor'
));

UPDATE profiles 
SET role = 'operador_caja' 
WHERE role = 'pos';

UPDATE profiles 
SET role = 'operador_cocina' 
WHERE role = 'comedor';

ALTER TABLE profiles 
DROP CONSTRAINT profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'parent',
  'superadmin', 
  'admin_general',
  'supervisor_red',
  'gestor_unidad',
  'operador_caja',
  'operador_cocina'
));

-- ==================
-- 2. MODULO PRODUCTOS
-- ==================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS price_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_sale DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS has_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_initial INTEGER,
ADD COLUMN IF NOT EXISTS stock_min INTEGER,
ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expiry_days INTEGER,
ADD COLUMN IF NOT EXISTS has_igv BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_wholesale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wholesale_qty INTEGER,
ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS school_ids TEXT[];

UPDATE products SET price_sale = price WHERE price_sale IS NULL AND price IS NOT NULL;

INSERT INTO permissions (module, action, name, description) VALUES
('productos', 'Ver', 'Ver Productos', 'Ver lista de productos'),
('productos', 'Crear', 'Crear Productos', 'Crear nuevos productos'),
('productos', 'Editar', 'Editar Productos', 'Modificar productos existentes'),
('productos', 'Eliminar', 'Eliminar Productos', 'Eliminar productos'),
('productos', 'Gestionar Menús', 'Gestionar Menús', 'Configurar menús del día')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'admin_general', id FROM permissions WHERE module = 'productos'
ON CONFLICT DO NOTHING;

-- ==================
-- 3. TABLA MENUS
-- ==================
DROP TRIGGER IF EXISTS trigger_update_weekly_menus_updated_at ON weekly_menus CASCADE;
DROP FUNCTION IF EXISTS update_weekly_menus_updated_at() CASCADE;

CREATE TABLE IF NOT EXISTS weekly_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_name VARCHAR(20) NOT NULL,
  breakfast TEXT,
  snack_morning TEXT,
  lunch TEXT,
  snack_afternoon TEXT,
  is_visible BOOLEAN DEFAULT true,
  visible_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_menus_school ON weekly_menus(school_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_date ON weekly_menus(date);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_visible ON weekly_menus(is_visible);

CREATE OR REPLACE FUNCTION update_weekly_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_weekly_menus_updated_at
  BEFORE UPDATE ON weekly_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_menus_updated_at();

-- ==================
-- 4. FIX RLS STUDENT RELATIONSHIPS
-- ==================
ALTER TABLE student_relationships DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their own student relationships" ON student_relationships;
DROP POLICY IF EXISTS "Parents can manage their own student relationships" ON student_relationships;
DROP POLICY IF EXISTS "Staff can view all relationships" ON student_relationships;
DROP POLICY IF EXISTS "Staff can manage all relationships" ON student_relationships;
DROP POLICY IF EXISTS "authenticated_users_student_relationships" ON student_relationships;
DROP POLICY IF EXISTS "allow_authenticated_select_student_relationships" ON student_relationships;
DROP POLICY IF EXISTS "allow_authenticated_insert_student_relationships" ON student_relationships;
DROP POLICY IF EXISTS "allow_authenticated_update_student_relationships" ON student_relationships;
DROP POLICY IF EXISTS "allow_authenticated_delete_student_relationships" ON student_relationships;

CREATE POLICY "allow_authenticated_select_student_relationships"
ON student_relationships FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_authenticated_insert_student_relationships"
ON student_relationships FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "allow_authenticated_update_student_relationships"
ON student_relationships FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_authenticated_delete_student_relationships"
ON student_relationships FOR DELETE TO authenticated USING (true);

ALTER TABLE student_relationships ENABLE ROW LEVEL SECURITY;

-- ==================
-- 5. STORAGE FOTOS
-- ==================
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "allow_authenticated_read_student_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_parents_upload_student_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_parents_update_student_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_parents_delete_student_photos" ON storage.objects;

CREATE POLICY "allow_authenticated_read_student_photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "allow_parents_upload_student_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "allow_parents_update_student_photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-photos')
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "allow_parents_delete_student_photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-photos');

-- ==================
-- VERIFICACION FINAL
-- ==================
SELECT 'SCRIPTS EJECUTADOS CORRECTAMENTE' as status;
SELECT COUNT(*) as total_productos FROM products;
SELECT COUNT(*) as total_menus FROM weekly_menus;
SELECT name FROM storage.buckets WHERE id = 'student-photos';

