-- =====================================================
-- BUSCAR EL NOMBRE CORRECTO DEL FOREIGN KEY DE created_by
-- =====================================================

-- Ver el constraint exacto de created_by
SELECT
  '🔗 FOREIGN KEY DE created_by' as tipo,
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
