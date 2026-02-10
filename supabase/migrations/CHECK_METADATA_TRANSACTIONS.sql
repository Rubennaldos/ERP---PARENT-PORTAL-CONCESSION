-- =====================================================
-- VERIFICAR SI LAS TRANSACCIONES TIENEN METADATA
-- =====================================================

SELECT 
  '🔍 TRANSACCIONES CON/SIN METADATA' as tipo,
  tp.full_name as profesor,
  t.id,
  t.description,
  t.metadata,
  CASE 
    WHEN t.metadata IS NULL THEN '❌ SIN metadata'
    WHEN t.metadata->'lunch_order_id' IS NULL THEN '⚠️ metadata sin lunch_order_id'
    ELSE '✅ metadata completo'
  END as estado_metadata
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
WHERE 
  t.description ILIKE '%almuerzo%'
  AND DATE(t.created_at) >= '2026-02-08'
ORDER BY tp.full_name
LIMIT 20;
