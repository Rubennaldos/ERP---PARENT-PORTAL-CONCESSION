-- ============================================================
-- LIMPIAR TODAS LAS REFERENCIAS al UID de Janeth
-- UID: 4ed725ab-854b-442a-95e0-2f67102fc0ad
-- ============================================================

BEGIN;

-- 1. Limpiar lunch_orders (created_by Y teacher_id)
UPDATE lunch_orders SET created_by = NULL WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';
UPDATE lunch_orders SET teacher_id = NULL WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 2. Limpiar transactions
UPDATE transactions SET created_by = NULL WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';
UPDATE transactions SET teacher_id = NULL WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 3. Limpiar cash_registers
UPDATE cash_registers SET opened_by = NULL WHERE opened_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 4. Limpiar cash_movements
UPDATE cash_movements SET created_by = NULL WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 5. Limpiar cash_closures
UPDATE cash_closures SET closed_by = NULL WHERE closed_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';
UPDATE cash_closures SET admin_validated_by = NULL WHERE admin_validated_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 6. Limpiar billing_config
UPDATE billing_config SET updated_by = NULL WHERE updated_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 8. Limpiar lunch_menus
UPDATE lunch_menus SET created_by = NULL WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 9. Limpiar profiles y teacher_profiles (por si acaso)
DELETE FROM profiles WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';
DELETE FROM teacher_profiles WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- 10. Verificación final — todos deben ser 0
SELECT 'lunch_orders created_by' as tabla, COUNT(*) as refs FROM lunch_orders WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'lunch_orders teacher_id', COUNT(*) FROM lunch_orders WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'transactions created_by', COUNT(*) FROM transactions WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'transactions teacher_id', COUNT(*) FROM transactions WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'cash_registers', COUNT(*) FROM cash_registers WHERE opened_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'cash_movements', COUNT(*) FROM cash_movements WHERE created_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'cash_closures closed_by', COUNT(*) FROM cash_closures WHERE closed_by = '4ed725ab-854b-442a-95e0-2f67102fc0ad'
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

COMMIT;

-- ============================================================
-- CUANDO TODOS LOS RESULTADOS SEAN 0, ejecuta esto:
-- DELETE FROM auth.users WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';
-- ============================================================
