-- ============================================================
-- Hacer el bucket 'vouchers' público para que las imágenes se vean
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Opción 1: Hacer el bucket público (recomendado - más simple)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'vouchers';

-- Si el bucket no existe, crearlo como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vouchers', 
  'vouchers', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política de storage: permitir a usuarios autenticados subir
DROP POLICY IF EXISTS "authenticated_upload_vouchers" ON storage.objects;
CREATE POLICY "authenticated_upload_vouchers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vouchers');

-- Política de storage: permitir lectura pública
DROP POLICY IF EXISTS "public_read_vouchers" ON storage.objects;
CREATE POLICY "public_read_vouchers" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'vouchers');

-- Política de storage: permitir a usuarios autenticados leer
DROP POLICY IF EXISTS "authenticated_read_vouchers" ON storage.objects;
CREATE POLICY "authenticated_read_vouchers" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vouchers');

SELECT 'Bucket vouchers configurado como público' AS resultado;
