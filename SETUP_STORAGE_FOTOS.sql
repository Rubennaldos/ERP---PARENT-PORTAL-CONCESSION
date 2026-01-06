-- =============================================
-- CONFIGURAR STORAGE PARA FOTOS DE ESTUDIANTES
-- =============================================

-- Crear bucket para fotos de estudiantes si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Cualquier usuario autenticado puede VER fotos
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_student_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-photos');

-- Política: Padres pueden SUBIR fotos de sus hijos
CREATE POLICY IF NOT EXISTS "allow_parents_upload_student_photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-photos' 
  AND auth.role() = 'authenticated'
);

-- Política: Padres pueden ACTUALIZAR fotos de sus hijos
CREATE POLICY IF NOT EXISTS "allow_parents_update_student_photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'student-photos')
WITH CHECK (bucket_id = 'student-photos');

-- Política: Padres pueden ELIMINAR fotos de sus hijos
CREATE POLICY IF NOT EXISTS "allow_parents_delete_student_photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'student-photos');

-- Verificar que el bucket se creó
SELECT * FROM storage.buckets WHERE id = 'student-photos';

