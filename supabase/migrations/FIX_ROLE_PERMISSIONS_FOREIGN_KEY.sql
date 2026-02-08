-- 🔧 ARREGLAR LA RELACIÓN ENTRE role_permissions Y permissions
-- El problema: La query con relación anidada de Supabase no está funcionando

-- ===================================================================
-- PASO 1: Verificar si existe la foreign key
-- ===================================================================
SELECT 
  '🔍 Foreign Keys actuales de role_permissions' as info,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'role_permissions'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ===================================================================
-- PASO 2: Ver la estructura de role_permissions
-- ===================================================================
SELECT 
  '📋 Columnas de role_permissions' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'role_permissions'
ORDER BY ordinal_position;

-- ===================================================================
-- PASO 3: Verificar que los permission_id existen en permissions
-- ===================================================================
SELECT 
  '⚠️ role_permissions con permission_id inválido' as problema,
  rp.role,
  rp.permission_id,
  rp.granted
FROM role_permissions rp
LEFT JOIN permissions p ON p.id = rp.permission_id
WHERE p.id IS NULL;

-- ===================================================================
-- PASO 4: CREAR/RECREAR la foreign key si no existe o está mal
-- ===================================================================
DO $$
BEGIN
  -- Primero, intentar eliminar la FK si existe (por si está mal configurada)
  BEGIN
    ALTER TABLE role_permissions 
    DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
    
    RAISE NOTICE '✅ Foreign key anterior eliminada (si existía)';
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ No había FK anterior o no se pudo eliminar';
  END;

  -- Crear la foreign key correctamente
  BEGIN
    ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey
    FOREIGN KEY (permission_id)
    REFERENCES permissions(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Foreign key CREADA correctamente';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error creando FK: %', SQLERRM;
  END;
END $$;

-- ===================================================================
-- PASO 5: TEST - Simular la query del frontend con JOIN explícito
-- ===================================================================
SELECT 
  '🧪 TEST: Query simulando el frontend para operador_caja' as test,
  rp.granted,
  json_build_object(
    'module', p.module,
    'action', p.action,
    'name', p.name
  ) as permissions
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'operador_caja'
  AND rp.granted = true
LIMIT 5;

-- ===================================================================
-- PASO 6: Verificar permiso específico de ventas para operador_caja
-- ===================================================================
SELECT 
  '🎯 ¿Tiene operador_caja el permiso ventas-access?' as pregunta,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SÍ'
    ELSE '❌ NO'
  END as respuesta,
  COUNT(*) as cantidad
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'operador_caja'
  AND rp.granted = true
  AND p.module = 'ventas'
  AND p.action = 'access';
