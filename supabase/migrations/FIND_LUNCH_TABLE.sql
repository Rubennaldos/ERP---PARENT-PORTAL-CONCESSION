-- 🔍 BUSCAR LA TABLA CORRECTA PARA ALMUERZOS

-- ===================================================================
-- Ver todas las tablas relacionadas con "lunch" o "almuerzo"
-- ===================================================================
SELECT 
  '📋 Tablas relacionadas con almuerzos' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%lunch%' OR table_name LIKE '%almuerzo%')
ORDER BY table_name;

-- ===================================================================
-- Ver todas las tablas del sistema
-- ===================================================================
SELECT 
  '📊 Todas las tablas' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
