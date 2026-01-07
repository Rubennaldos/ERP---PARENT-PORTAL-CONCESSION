-- =====================================================
-- SCRIPT: SISTEMA DE VÍNCULOS FAMILIARES
-- Fecha: 2026-01-07
-- Descripción: Sistema para vincular estudiantes (hermanos, primos, amigos)
-- =====================================================

-- 1. Crear tabla de vínculos entre estudiantes (si no existe)
CREATE TABLE IF NOT EXISTS student_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('hermanos', 'primos', 'amigos', 'gemelos')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint para evitar duplicados y auto-vínculos
  CONSTRAINT no_self_link CHECK (student_a_id != student_b_id),
  CONSTRAINT unique_link UNIQUE (student_a_id, student_b_id)
);

-- 2. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_student_links_student_a ON student_links(student_a_id);
CREATE INDEX IF NOT EXISTS idx_student_links_student_b ON student_links(student_b_id);
CREATE INDEX IF NOT EXISTS idx_student_links_type ON student_links(relationship_type);

-- 3. Función para obtener todos los vínculos de un estudiante
CREATE OR REPLACE FUNCTION get_student_links(p_student_id UUID)
RETURNS TABLE(
  linked_student_id UUID,
  linked_student_name TEXT,
  linked_student_grade TEXT,
  relationship_type TEXT,
  link_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    CASE 
      WHEN sl.student_a_id = p_student_id THEN sl.student_b_id
      ELSE sl.student_a_id
    END as linked_student_id,
    s.full_name as linked_student_name,
    s.grade as linked_student_grade,
    sl.relationship_type,
    sl.id as link_id
  FROM student_links sl
  JOIN students s ON (
    (sl.student_a_id = p_student_id AND s.id = sl.student_b_id) OR
    (sl.student_b_id = p_student_id AND s.id = sl.student_a_id)
  )
  WHERE sl.student_a_id = p_student_id OR sl.student_b_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para crear un vínculo bidireccional
CREATE OR REPLACE FUNCTION create_student_link(
  p_student_a_id UUID,
  p_student_b_id UUID,
  p_relationship_type TEXT,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_link_id UUID;
  v_student_a UUID;
  v_student_b UUID;
BEGIN
  -- Ordenar los IDs para evitar duplicados (A-B y B-A)
  IF p_student_a_id < p_student_b_id THEN
    v_student_a := p_student_a_id;
    v_student_b := p_student_b_id;
  ELSE
    v_student_a := p_student_b_id;
    v_student_b := p_student_a_id;
  END IF;
  
  -- Insertar o actualizar el vínculo
  INSERT INTO student_links (student_a_id, student_b_id, relationship_type, created_by)
  VALUES (v_student_a, v_student_b, p_relationship_type, p_created_by)
  ON CONFLICT (student_a_id, student_b_id) 
  DO UPDATE SET relationship_type = p_relationship_type
  RETURNING id INTO v_link_id;
  
  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies
ALTER TABLE student_links ENABLE ROW LEVEL SECURITY;

-- Los padres pueden ver los vínculos de sus hijos
DROP POLICY IF EXISTS "Parents can view their children's links" ON student_links;
CREATE POLICY "Parents can view their children's links" ON student_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE parent_id = auth.uid()
        AND (id = student_a_id OR id = student_b_id)
    )
  );

-- Los padres pueden crear vínculos entre sus hijos
DROP POLICY IF EXISTS "Parents can create links for their children" ON student_links;
CREATE POLICY "Parents can create links for their children" ON student_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE parent_id = auth.uid()
        AND (id = student_a_id OR id = student_b_id)
    )
  );

-- Los padres pueden eliminar vínculos de sus hijos
DROP POLICY IF EXISTS "Parents can delete their children's links" ON student_links;
CREATE POLICY "Parents can delete their children's links" ON student_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE parent_id = auth.uid()
        AND (id = student_a_id OR id = student_b_id)
    )
  );

-- Staff puede gestionar todos los vínculos
DROP POLICY IF EXISTS "Staff can manage all links" ON student_links;
CREATE POLICY "Staff can manage all links" ON student_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'supervisor_red', 'gestor_unidad')
    )
  );

-- 6. Permisos
GRANT EXECUTE ON FUNCTION get_student_links(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_student_link(UUID, UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

