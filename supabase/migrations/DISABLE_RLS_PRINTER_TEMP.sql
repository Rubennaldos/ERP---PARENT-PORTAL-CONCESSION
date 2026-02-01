-- =====================================================
-- SOLUCIÓN DEFINITIVA: Deshabilitar RLS temporalmente
-- =====================================================

-- PASO 1: Verificar tu rol actual
SELECT 
  id,
  email,
  role,
  full_name
FROM public.profiles
WHERE id = auth.uid();

-- Si el resultado de arriba NO muestra 'superadmin', ejecuta esto:
-- (Reemplaza 'TU_EMAIL@AQUI.COM' con tu email real)

-- UPDATE public.profiles
-- SET role = 'superadmin'
-- WHERE email = 'superadmin@limacafe28.com';

-- PASO 2: DESHABILITAR RLS temporalmente para printer_configs
ALTER TABLE public.printer_configs DISABLE ROW LEVEL SECURITY;

-- PASO 3: Verificar que RLS está deshabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'printer_configs';

-- Debería mostrar: rowsecurity = false

-- PASO 4: Probar inserción directa (para verificar)
SELECT COUNT(*) as total_configs
FROM public.printer_configs;

-- =====================================================
-- NOTA: Una vez que todo funcione, puedes RE-HABILITAR
-- RLS ejecutando:
-- 
-- ALTER TABLE public.printer_configs ENABLE ROW LEVEL SECURITY;
-- 
-- Y luego arreglaremos las políticas correctamente
-- =====================================================
