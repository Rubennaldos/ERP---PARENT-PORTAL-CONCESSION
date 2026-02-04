-- ================================================================
-- BORRAR PEDIDOS DE ALMUERZO DE PRUEBA DEL DÍA 3 DE FEBRERO 2026
-- ================================================================
-- FECHA: 2026-02-04
-- DESCRIPCIÓN: Elimina los pedidos de prueba realizados el día 3
--              (profesorjbl, prueba niño 1, prueba niño 2)
-- ================================================================

-- PASO 1: Ver qué pedidos vamos a borrar (EJECUTA ESTO PRIMERO)
SELECT 
  'PEDIDOS A BORRAR' as tipo,
  lo.id,
  lo.created_at,
  lo.status,
  lo.manual_name,
  lo.student_id,
  lo.teacher_id,
  lo.menu_id,
  lc.name as category_name,
  lc.price as price,
  sch.name as school_name
FROM lunch_orders lo
LEFT JOIN lunch_menus lm ON lo.menu_id = lm.id
LEFT JOIN lunch_categories lc ON lm.category_id = lc.id
LEFT JOIN schools sch ON lo.school_id = sch.id
WHERE DATE(lo.created_at) = '2026-02-03'
  OR lo.manual_name ILIKE '%profesorjbl%' 
  OR lo.manual_name ILIKE '%prueba niño%'
ORDER BY lo.created_at DESC;

-- ================================================================

-- PASO 2: Ver si hay transacciones relacionadas (EJECUTA ESTO SEGUNDO)
SELECT 
  'TRANSACCIONES RELACIONADAS' as tipo,
  t.id,
  t.created_at,
  t.type,
  t.amount,
  t.description,
  t.student_id,
  t.teacher_id,
  sch.name as school_name
FROM transactions t
LEFT JOIN schools sch ON t.school_id = sch.id
WHERE t.description ILIKE '%almuerzo%'
  AND DATE(t.created_at) = '2026-02-03'
ORDER BY t.created_at DESC;

-- ================================================================

-- PASO 3: BORRAR (EJECUTA ESTO AL FINAL, SI CONFIRMAS QUE ESTÁN CORRECTOS)
-- ⚠️ ADVERTENCIA: ESTE PASO ES IRREVERSIBLE

-- Primero borramos los items de transacciones relacionadas
DELETE FROM transaction_items 
WHERE transaction_id IN (
  SELECT t.id 
  FROM transactions t
  WHERE t.description ILIKE '%almuerzo%'
    AND DATE(t.created_at) = '2026-02-03'
);

-- Luego borramos las transacciones relacionadas
DELETE FROM transactions 
WHERE description ILIKE '%almuerzo%'
  AND DATE(created_at) = '2026-02-03';

-- Finalmente borramos los pedidos
DELETE FROM lunch_orders 
WHERE DATE(created_at) = '2026-02-03'
  OR manual_name ILIKE '%profesorjbl%' 
  OR manual_name ILIKE '%prueba niño%';

-- Ver resultado
SELECT 'PEDIDOS BORRADOS EXITOSAMENTE' as resultado;

-- ================================================================
