-- 🔍 DIAGNÓSTICO: Verificar estructura actual del sistema de permisos

-- Ver si las tablas existen
SELECT 
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('modules', 'module_actions', 'role_permissions', 'user_custom_permissions')
ORDER BY table_name;

-- Ver estructura de modules
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'modules'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver estructura de module_actions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'module_actions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver estructura de role_permissions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'role_permissions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver datos existentes en modules
SELECT * FROM modules LIMIT 5;

-- Ver datos existentes en module_actions
SELECT * FROM module_actions LIMIT 5;

-- Ver datos existentes en role_permissions
SELECT * FROM role_permissions LIMIT 5;
