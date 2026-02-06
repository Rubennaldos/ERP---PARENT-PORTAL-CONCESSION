-- 🔍 DIAGNÓSTICO COMPLETO: Ver todas las tablas relacionadas con permisos

-- 1. Ver todas las tablas que existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%permission%' 
  OR table_name LIKE '%module%'
ORDER BY table_name;

-- 2. Ver estructura de role_permissions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'role_permissions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Buscar tabla de permisos (puede ser 'permissions', 'permission', 'module_permissions', etc.)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%permission%' 
    OR table_name LIKE '%access%'
    OR table_name LIKE '%privilege%'
  )
ORDER BY table_name;

-- 4. Ver datos de role_permissions para entender la estructura
SELECT * FROM role_permissions LIMIT 10;

-- 5. Si existe una tabla 'permissions', ver su contenido
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    EXECUTE 'SELECT * FROM permissions LIMIT 20';
  ELSE
    RAISE NOTICE 'Tabla permissions no existe';
  END IF;
END $$;

-- 6. Ver todas las columnas de todas las tablas con 'permission' en el nombre
SELECT 
  t.table_name,
  c.column_name,
  c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_name LIKE '%permission%'
ORDER BY t.table_name, c.ordinal_position;
