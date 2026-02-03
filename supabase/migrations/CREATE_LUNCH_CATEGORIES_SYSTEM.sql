-- ============================================
-- SISTEMA DE CATEGORÍAS DE ALMUERZOS
-- ============================================
-- Permite crear diferentes tipos de almuerzos con categorías personalizadas
-- Ejemplos: Almuerzo Clásico, Almuerzo Light, Almuerzo Económico, Almuerzo Vegetariano, etc.

-- Paso 1: Crear tabla de categorías de almuerzos
CREATE TABLE IF NOT EXISTS lunch_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- Ej: "Almuerzo Clásico", "Almuerzo Light", "Almuerzo Vegetariano"
  description TEXT, -- Descripción opcional de la categoría
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('students', 'teachers', 'both')), -- Para quién es este almuerzo
  color VARCHAR(7) DEFAULT '#3B82F6', -- Color para identificar visualmente la categoría (Hex)
  icon VARCHAR(50) DEFAULT 'utensils', -- Icono lucide-react
  price DECIMAL(10, 2), -- Precio opcional por defecto para esta categoría
  is_active BOOLEAN DEFAULT true, -- Si está activa o no
  display_order INTEGER DEFAULT 0, -- Orden de visualización
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para lunch_categories
CREATE INDEX idx_lunch_categories_school ON lunch_categories(school_id);
CREATE INDEX idx_lunch_categories_target ON lunch_categories(target_type);
CREATE INDEX idx_lunch_categories_active ON lunch_categories(is_active);

-- Paso 2: Modificar tabla lunch_menus para agregar category_id
-- Primero verificamos si la columna ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lunch_menus' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE lunch_menus ADD COLUMN category_id UUID REFERENCES lunch_categories(id) ON DELETE SET NULL;
    CREATE INDEX idx_lunch_menus_category ON lunch_menus(category_id);
  END IF;
END $$;

-- Paso 3: Agregar target_type a lunch_menus si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lunch_menus' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE lunch_menus ADD COLUMN target_type VARCHAR(20) DEFAULT 'students' CHECK (target_type IN ('students', 'teachers', 'both'));
    CREATE INDEX idx_lunch_menus_target ON lunch_menus(target_type);
  END IF;
END $$;

-- Paso 4: Insertar categorías por defecto para cada escuela
INSERT INTO lunch_categories (school_id, name, description, target_type, color, icon, display_order)
SELECT 
  id as school_id,
  'Almuerzo Clásico',
  'Menú tradicional completo con entrada, segundo, bebida y postre',
  'students',
  '#3B82F6', -- Azul
  'utensils',
  1
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM lunch_categories lc 
  WHERE lc.school_id = schools.id AND lc.name = 'Almuerzo Clásico'
);

INSERT INTO lunch_categories (school_id, name, description, target_type, color, icon, display_order)
SELECT 
  id as school_id,
  'Almuerzo Light',
  'Opción saludable y ligera, ideal para cuidar la alimentación',
  'students',
  '#10B981', -- Verde
  'salad',
  2
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM lunch_categories lc 
  WHERE lc.school_id = schools.id AND lc.name = 'Almuerzo Light'
);

INSERT INTO lunch_categories (school_id, name, description, target_type, color, icon, display_order)
SELECT 
  id as school_id,
  'Almuerzo Económico',
  'Menú accesible sin comprometer la calidad nutricional',
  'students',
  '#F59E0B', -- Amarillo/Naranja
  'coins',
  3
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM lunch_categories lc 
  WHERE lc.school_id = schools.id AND lc.name = 'Almuerzo Económico'
);

INSERT INTO lunch_categories (school_id, name, description, target_type, color, icon, display_order)
SELECT 
  id as school_id,
  'Almuerzo para Profesores',
  'Menú especial diseñado para el personal docente',
  'teachers',
  '#8B5CF6', -- Púrpura
  'briefcase',
  4
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM lunch_categories lc 
  WHERE lc.school_id = schools.id AND lc.name = 'Almuerzo para Profesores'
);

INSERT INTO lunch_categories (school_id, name, description, target_type, color, icon, display_order)
SELECT 
  id as school_id,
  'Almuerzo Vegetariano',
  'Opciones 100% vegetarianas, sin carnes ni pescados',
  'both',
  '#059669', -- Verde oscuro
  'leaf',
  5
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM lunch_categories lc 
  WHERE lc.school_id = schools.id AND lc.name = 'Almuerzo Vegetariano'
);

-- Paso 5: RLS Policies para lunch_categories
ALTER TABLE lunch_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Admin general puede ver todo
CREATE POLICY "admin_general_view_all_categories" ON lunch_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin_general'
    )
  );

-- Policy: Gestor de unidad puede ver categorías de su escuela
CREATE POLICY "gestor_view_own_school_categories" ON lunch_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'gestor_unidad'
      AND up.school_id = lunch_categories.school_id
    )
  );

-- Policy: Admin general puede insertar categorías
CREATE POLICY "admin_general_insert_categories" ON lunch_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin_general'
    )
  );

-- Policy: Gestor puede insertar categorías para su escuela
CREATE POLICY "gestor_insert_own_school_categories" ON lunch_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'gestor_unidad'
      AND up.school_id = lunch_categories.school_id
    )
  );

-- Policy: Admin general puede actualizar categorías
CREATE POLICY "admin_general_update_categories" ON lunch_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin_general'
    )
  );

-- Policy: Gestor puede actualizar categorías de su escuela
CREATE POLICY "gestor_update_own_school_categories" ON lunch_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'gestor_unidad'
      AND up.school_id = lunch_categories.school_id
    )
  );

-- Policy: Admin general puede eliminar categorías
CREATE POLICY "admin_general_delete_categories" ON lunch_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin_general'
    )
  );

-- Policy: Gestor puede eliminar categorías de su escuela
CREATE POLICY "gestor_delete_own_school_categories" ON lunch_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.role = 'gestor_unidad'
      AND up.school_id = lunch_categories.school_id
    )
  );

-- Paso 6: Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_lunch_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lunch_categories_updated_at
  BEFORE UPDATE ON lunch_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_lunch_categories_updated_at();

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE lunch_categories IS 'Categorías de almuerzos personalizables por escuela (Ej: Clásico, Light, Económico, Vegetariano)';
COMMENT ON COLUMN lunch_categories.target_type IS 'Para quién es el almuerzo: students (alumnos), teachers (profesores), o both (ambos)';
COMMENT ON COLUMN lunch_categories.color IS 'Color hexadecimal para identificar visualmente la categoría en la UI';
COMMENT ON COLUMN lunch_categories.icon IS 'Nombre del icono de lucide-react para mostrar en la UI';
COMMENT ON COLUMN lunch_categories.display_order IS 'Orden de visualización en la interfaz (menor número = primero)';
