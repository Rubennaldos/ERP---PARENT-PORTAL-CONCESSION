-- =====================================================
-- BUSCAR TODAS LAS TRANSACCIONES DEL 8 Y 9 DE FEBRERO
-- (Sin importar la descripción)
-- =====================================================

-- Ver TODAS las transacciones de profesores del 8 y 9 de febrero
SELECT 
  '🔍 TODAS LAS TRANSACCIONES 8 y 9/2' as tipo,
  DATE(t.created_at) as fecha_creacion,
  tp.full_name as profesor,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado_el,
  COALESCE(p.full_name, '🤖 SISTEMA/NULL') as creado_por,
  COALESCE(p.email, 'N/A') as email,
  t.payment_status
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE DATE(t.created_at) IN ('2026-02-08', '2026-02-09')
  AND t.type = 'purchase'
  AND t.amount < 0
ORDER BY tp.full_name, t.created_at;
