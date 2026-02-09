-- ELIMINAR COMPLETAMENTE al profesor Beto de prueba (alberto@gmail.com)
-- ID: f4a33af1-012b-4347-8056-27af58edb7bc

-- ⚠️ ADVERTENCIA: Esta operación NO se puede deshacer

-- 1. Ver qué se va a eliminar (RESUMEN)
SELECT 
  'RESUMEN - Datos a eliminar' as info,
  (SELECT COUNT(*) FROM transactions WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc') as transacciones,
  (SELECT COUNT(*) FROM transactions WHERE teacher_id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as compras_credito_profesor,
  (SELECT COUNT(*) FROM lunch_orders WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc') as ordenes_almuerzo,
  (SELECT COUNT(*) FROM teacher_profiles WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as teacher_profile,
  (SELECT COUNT(*) FROM profiles WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as profile,
  (SELECT COUNT(*) FROM auth.users WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as auth_user;

-- 2. PASO 1: Eliminar todas las transacciones creadas por este profesor
DELETE FROM transactions 
WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 3. PASO 2: Eliminar todas las compras a crédito hechas por este profesor (como cliente)
DELETE FROM transactions 
WHERE teacher_id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 4. PASO 3: Eliminar órdenes de almuerzo
DELETE FROM lunch_orders 
WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 5. PASO 4: Eliminar movimientos de caja si los hay
DELETE FROM cash_movements 
WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 6. PASO 5: Eliminar de teacher_profiles
DELETE FROM teacher_profiles 
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 7. PASO 6: Eliminar de profiles (si existe)
DELETE FROM profiles 
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 8. PASO 7: Eliminar de auth.users (cuenta de autenticación)
-- NOTA: Esto debe hacerse desde el dashboard de Supabase en la sección de Authentication
-- O usar la función de admin:
DELETE FROM auth.users 
WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc';

-- 9. Verificar que se eliminó todo
SELECT 
  'VERIFICACIÓN FINAL - Todo debería estar en 0' as resultado,
  (SELECT COUNT(*) FROM transactions WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc') as transacciones,
  (SELECT COUNT(*) FROM transactions WHERE teacher_id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as compras_credito,
  (SELECT COUNT(*) FROM lunch_orders WHERE created_by = 'f4a33af1-012b-4347-8056-27af58edb7bc') as ordenes_almuerzo,
  (SELECT COUNT(*) FROM teacher_profiles WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as teacher_profile,
  (SELECT COUNT(*) FROM profiles WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as profile,
  (SELECT COUNT(*) FROM auth.users WHERE id = 'f4a33af1-012b-4347-8056-27af58edb7bc') as auth_user;

-- 10. Verificar estadísticas de profesores después de la eliminación
SELECT 
  'PROFESORES RESTANTES' as info,
  COUNT(*) as total_profesores
FROM teacher_profiles;
