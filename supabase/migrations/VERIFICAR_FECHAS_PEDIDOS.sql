-- ============================================
-- VERIFICAR FECHAS DE LOS PEDIDOS
-- ============================================

-- Ver los pedidos de Rubén y Prueba 1 con sus fechas exactas
SELECT 
    lo.id,
    lo.order_date,
    lo.created_at,
    lo.school_id,
    s.name as nombre_escuela,
    tp.full_name as profesor
FROM lunch_orders lo
LEFT JOIN schools s ON lo.school_id = s.id
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE tp.full_name IN ('Prueba 1', 'Rubén Alberto Naldos Nuñez')
ORDER BY lo.order_date DESC;

-- Ver TODOS los pedidos de Miraflores del 05 y 06 de febrero
SELECT 
    lo.id,
    lo.order_date,
    lo.status,
    lo.school_id,
    s.name as nombre_escuela,
    COALESCE(st.full_name, tp.full_name, lo.manual_name) as nombre
FROM lunch_orders lo
LEFT JOIN schools s ON lo.school_id = s.id
LEFT JOIN students st ON lo.student_id = st.id
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.school_id = '2a50533d-7fc1-4096-80a7-e20a41bda5a0'
  AND lo.order_date IN ('2026-02-05', '2026-02-06')
  AND lo.is_cancelled = false
ORDER BY lo.order_date, lo.created_at;
