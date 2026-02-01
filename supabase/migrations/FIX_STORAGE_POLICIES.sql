-- =====================================================
-- FIX: Políticas de Storage para school-assets
-- =====================================================

-- PASO 1: ELIMINAR TODAS las políticas de school-assets (sin importar el nombre)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname ILIKE '%school%' OR policyname ILIKE '%asset%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END $$;

-- PASO 2: Crear políticas SIMPLES que funcionen

-- Policy 1: Todos pueden LEER (para ver los logos en tickets)
CREATE POLICY "Anyone can view school assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

-- Policy 2: Usuarios autenticados pueden SUBIR
CREATE POLICY "Authenticated can upload to school-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-assets');

-- Policy 3: Usuarios autenticados pueden ACTUALIZAR
CREATE POLICY "Authenticated can update school-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'school-assets')
WITH CHECK (bucket_id = 'school-assets');

-- Policy 4: Usuarios autenticados pueden ELIMINAR
CREATE POLICY "Authenticated can delete from school-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'school-assets');

-- PASO 3: Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname ILIKE '%school%'
ORDER BY policyname;

-- PASO 4: Verificar el bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'school-assets';
