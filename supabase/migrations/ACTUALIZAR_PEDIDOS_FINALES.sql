-- ============================================
-- ACTUALIZAR PEDIDOS EXISTENTES A SU SEDE CORRECTA
-- ============================================

-- 1. Actualizar pedido de Rubén a Miraflores
UPDATE lunch_orders
SET school_id = '2a50533d-7fc1-4096-80a7-e20a41bda5a0'
WHERE teacher_id = '6a82dab8-785d-4d9f-87b3-2bd0356dae28'
  AND order_date >= '2026-02-04';

-- 2. Actualizar pedido de Prueba 1 a Miraflores
UPDATE lunch_orders
SET school_id = '2a50533d-7fc1-4096-80a7-e20a41bda5a0'
WHERE id = '56708101-9afb-4134-91cd-ab378d5e8ca4';

-- 3. Verificar que se actualizaron correctamente
SELECT 
    lo.id,
    lo.order_date,
    lo.school_id,
    s.name as nombre_escuela,
    s.code as codigo,
    tp.full_name as profesor
FROM lunch_orders lo
LEFT JOIN schools s ON lo.school_id = s.id
LEFT JOIN teacher_profiles tp ON lo.teacher_id = tp.id
WHERE lo.id IN (
    '56708101-9afb-4134-91cd-ab378d5e8ca4', -- Prueba 1
    '2d648a6c-94fd-4db9-ae34-3219a5f7fa3e'  -- Rubén (si existe)
)
OR tp.full_name ILIKE '%rubén%alberto%naldos%'
ORDER BY lo.created_at DESC;
