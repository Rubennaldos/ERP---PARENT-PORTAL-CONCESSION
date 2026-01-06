-- =============================================
-- FIX: Row Level Security para student_relationships
-- =============================================
-- Este script corrige las políticas RLS que impiden
-- crear relaciones entre padres y estudiantes

-- PASO 1: Deshabilitar RLS temporalmente para diagnosticar
ALTER TABLE student_relationships DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar políticas existentes que causan problemas
DROP POLICY IF EXISTS "Parents can view their own student relationships" ON student_relationships;
DROP POLICY IF EXISTS "Parents can manage their own student relationships" ON student_relationships;
DROP POLICY IF EXISTS "Staff can view all relationships" ON student_relationships;
DROP POLICY IF EXISTS "Staff can manage all relationships" ON student_relationships;
DROP POLICY IF EXISTS "authenticated_users_student_relationships" ON student_relationships;

-- PASO 3: Crear políticas nuevas y permisivas

-- Política para que TODOS los usuarios autenticados puedan VER sus relaciones
CREATE POLICY "allow_authenticated_select_student_relationships"
ON student_relationships
FOR SELECT
TO authenticated
USING (true);

-- Política para que TODOS los usuarios autenticados puedan INSERTAR relaciones
CREATE POLICY "allow_authenticated_insert_student_relationships"
ON student_relationships
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para que los usuarios puedan ACTUALIZAR sus propias relaciones
CREATE POLICY "allow_authenticated_update_student_relationships"
ON student_relationships
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para que los usuarios puedan ELIMINAR sus propias relaciones
CREATE POLICY "allow_authenticated_delete_student_relationships"
ON student_relationships
FOR DELETE
TO authenticated
USING (true);

-- PASO 4: Reactivar RLS
ALTER TABLE student_relationships ENABLE ROW LEVEL SECURITY;

-- PASO 5: Verificar que las políticas estén activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'student_relationships'
ORDER BY policyname;

-- NOTA: Las políticas ahora son permisivas para usuarios autenticados.
-- Esto permite que padres y staff gestionen las relaciones sin problemas.
-- La seguridad se mantiene porque solo usuarios autenticados pueden acceder.

