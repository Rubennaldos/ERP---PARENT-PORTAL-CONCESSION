-- =====================================================
-- VERIFICAR ESTRUCTURA DE CREATED_BY
-- =====================================================

-- 1️⃣ Ver la estructura de la columna created_by
SELECT 
  '🔍 ESTRUCTURA DE created_by' as tipo,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'created_by';

-- 2️⃣ Ver las foreign keys de transactions
SELECT
  '🔗 FOREIGN KEYS DE TRANSACTIONS' as tipo,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'transactions'
  AND kcu.column_name = 'created_by';

-- 3️⃣ Ver si existe la tabla user_profiles o auth.users
SELECT 
  '📋 TABLAS RELACIONADAS CON USUARIOS' as tipo,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%user%' OR table_name LIKE '%profile%')
ORDER BY table_name;
