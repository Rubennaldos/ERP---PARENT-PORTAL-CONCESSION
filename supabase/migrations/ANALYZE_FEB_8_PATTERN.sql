-- =====================================================
-- ANALIZAR PATRÓN DE DUPLICADOS EN DETALLE
-- =====================================================

-- Ver profesores con transacciones del "8 de febrero" creadas automáticamente (sin created_by)
SELECT 
  '🤖 TRANSACCIONES AUTOMÁTICAS DEL 8 DE FEBRERO' as tipo,
  tp.full_name as profesor,
  t.description,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as hora_creacion,
  lo.order_date as fecha_del_pedido_real,
  TO_CHAR(lo.created_at, 'YYYY-MM-DD HH24:MI:SS') as hora_pedido_real,
  lm.main_course as plato_pedido
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN lunch_orders lo ON lo.teacher_id = tp.id 
  AND DATE(lo.created_at) = DATE(t.created_at)
LEFT JOIN lunch_menus lm ON lm.id = lo.menu_id
WHERE t.created_by IS NULL
  AND t.description ILIKE '%8 de febrero%'
  AND DATE(t.created_at) = '2026-02-09'
ORDER BY tp.full_name, t.created_at;

-- Ver si hay pedidos del 8 de febrero que hayan sido modificados/actualizados
SELECT 
  '📝 PEDIDOS DEL 8 DE FEBRERO (MODIFICADOS?)' as tipo,
  lo.id,
  tp.full_name as profesor,
  lo.order_date,
  lo.status,
  TO_CHAR(lo.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado,
  TO_CHAR(lo.updated_at, 'YYYY-MM-DD HH24:MI:SS') as actualizado,
  CASE 
    WHEN lo.created_at != lo.updated_at THEN '⚠️ MODIFICADO'
    ELSE '✅ Sin cambios'
  END as estado_modificacion
FROM lunch_orders lo
JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.order_date = '2026-02-08'
  AND lo.teacher_id IN (
    SELECT DISTINCT teacher_id 
    FROM transactions 
    WHERE description ILIKE '%8 de febrero%' 
      AND created_by IS NULL
      AND teacher_id IS NOT NULL
  )
ORDER BY tp.full_name, lo.created_at;
