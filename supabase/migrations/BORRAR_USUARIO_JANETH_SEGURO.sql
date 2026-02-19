-- ============================================================
-- BORRADO SEGURO: janeth.valderrama@upsjb.edu.pe
-- UID: 4ed725ab-854b-442a-95e0-2f67102fc0ad
-- 
-- ✅ PRESERVA: transactions (historial de ventas/cobros)
-- ✅ PRESERVA: lunch_orders (historial de almuerzos)
-- ✅ PRESERVA: los registros con teacher_id o created_by de este usuario
--             (se dejan como referencia histórica con NULL o como están)
--
-- ⚠️ EJECUTAR SOLO DESPUÉS DE VERIFICAR QUE NO HAY DEUDAS PENDIENTES
-- ============================================================

BEGIN;

-- PASO 1: Desvincular transacciones para que no se borren en cascade
-- Ponemos teacher_id = NULL en transacciones donde ella es el sujeto
-- El historial se conserva, solo pierde el link al usuario
UPDATE transactions
SET teacher_id = NULL
WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- PASO 2: Desvincular lunch_orders
UPDATE lunch_orders
SET teacher_id = NULL
WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- PASO 3: Verificar que ya no hay referencias directas del teacher_id
SELECT 
  (SELECT COUNT(*) FROM transactions WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad') AS trans_pendientes,
  (SELECT COUNT(*) FROM lunch_orders WHERE teacher_id = '4ed725ab-854b-442a-95e0-2f67102fc0ad') AS pedidos_pendientes;

-- PASO 4: Borrar de teacher_profiles (si existe ahí)
DELETE FROM teacher_profiles
WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- PASO 5: Borrar de profiles
DELETE FROM profiles
WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad';

-- PASO 6: Confirmar
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad') AS perfil_borrado,
  (SELECT COUNT(*) FROM teacher_profiles WHERE id = '4ed725ab-854b-442a-95e0-2f67102fc0ad') AS teacher_borrado,
  (SELECT COUNT(*) FROM transactions WHERE teacher_id IS NULL AND description ILIKE '%Compra Profesor%') AS historico_conservado;

-- ⚠️ Si los SELECTs del paso 6 muestran 0,0 → perfil borrado correctamente
-- Luego debes ir a Supabase Dashboard > Authentication > Users y borrar manualmente
-- al usuario auth: 4ed725ab-854b-442a-95e0-2f67102fc0ad

COMMIT;
