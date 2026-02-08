-- 🔧 VERIFICAR Y CREAR CONFIGURACIÓN DE CAJA POR DEFECTO

-- ===================================================================
-- PASO 1: Verificar configuraciones existentes
-- ===================================================================
SELECT 
  '📋 Configuraciones existentes' as info,
  cr.id,
  cr.school_id,
  s.name as sede,
  cr.auto_close_enabled,
  cr.auto_close_time,
  cr.whatsapp_number
FROM cash_register_config cr
JOIN schools s ON s.id = cr.school_id;

-- ===================================================================
-- PASO 2: Crear configuración por defecto para TODAS las sedes
-- ===================================================================
INSERT INTO cash_register_config (
  school_id,
  auto_close_enabled,
  auto_close_time,
  require_admin_password,
  whatsapp_number,
  created_at
)
SELECT 
  s.id,
  false,
  '18:00:00'::time,
  true,
  '991236870',
  NOW()
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 
  FROM cash_register_config cr 
  WHERE cr.school_id = s.id
);

-- ===================================================================
-- PASO 3: Verificar políticas RLS de cash_register_config
-- ===================================================================
SELECT 
  '🔒 Políticas RLS' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'cash_register_config';

-- ===================================================================
-- PASO 4: Verificación final
-- ===================================================================
SELECT 
  '✅ Configuraciones después de crear' as resultado,
  cr.id,
  s.name as sede,
  cr.auto_close_enabled,
  cr.auto_close_time,
  cr.whatsapp_number
FROM cash_register_config cr
JOIN schools s ON s.id = cr.school_id
ORDER BY s.name;
