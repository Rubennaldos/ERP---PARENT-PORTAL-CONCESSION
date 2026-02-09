-- SOLUCIÓN COMPLETA PARA PROFESORES

-- ========================================
-- 1. VER Y CONFIGURAR EL DELAY DE VISIBILIDAD
-- ========================================

-- Ver el delay actual para cada sede
SELECT 
  'DELAY ACTUAL POR SEDE' as info,
  s.name as sede,
  pvd.delay_days as dias_delay,
  pvd.updated_at
FROM purchase_visibility_delay pvd
JOIN schools s ON pvd.school_id = s.id
ORDER BY s.name;

-- DESACTIVAR EL DELAY (ponerlo en 0) para todas las sedes
UPDATE purchase_visibility_delay
SET delay_days = 0,
    updated_at = NOW();

-- Si NO existe configuración de delay para alguna sede, crearla con 0 días
INSERT INTO purchase_visibility_delay (school_id, delay_days, created_at, updated_at)
SELECT 
  id,
  0,
  NOW(),
  NOW()
FROM schools
WHERE id NOT IN (SELECT school_id FROM purchase_visibility_delay);

-- Verificar que se actualizó
SELECT 
  'DELAY DESPUÉS DE ACTUALIZAR' as info,
  s.name as sede,
  pvd.delay_days as dias_delay
FROM purchase_visibility_delay pvd
JOIN schools s ON pvd.school_id = s.id
ORDER BY s.name;

-- ========================================
-- 2. VERIFICAR RLS POLICIES DE LUNCH_ORDERS
-- ========================================

-- Ver las policies actuales
SELECT 
  'POLICIES ACTUALES' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'lunch_orders';

-- CREAR/RECREAR RLS POLICIES PARA LUNCH_ORDERS
-- Habilitar RLS
ALTER TABLE lunch_orders ENABLE ROW LEVEL SECURITY;

-- DROP existing policies
DROP POLICY IF EXISTS "Users can view their own lunch orders" ON lunch_orders;
DROP POLICY IF EXISTS "Users can insert their own lunch orders" ON lunch_orders;
DROP POLICY IF EXISTS "Users can update their own lunch orders" ON lunch_orders;
DROP POLICY IF EXISTS "Admins can view all lunch orders" ON lunch_orders;
DROP POLICY IF EXISTS "Admins can manage all lunch orders" ON lunch_orders;

-- Policy 1: SELECT - Ver propios pedidos
CREATE POLICY "Users can view lunch orders"
ON lunch_orders FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  )
  OR
  -- Padres pueden ver pedidos de sus hijos
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
  OR
  -- Profesores pueden ver sus propios pedidos
  teacher_id = auth.uid()
  OR
  -- Staff puede ver pedidos de su sede
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_general', 'supervisor_red', 'gestor_unidad', 'operador_cocina')
      AND (
        p.role IN ('admin_general', 'supervisor_red')
        OR p.school_id = lunch_orders.school_id
      )
  )
);

-- Policy 2: INSERT - Crear pedidos
CREATE POLICY "Users can create lunch orders"
ON lunch_orders FOR INSERT
TO authenticated
WITH CHECK (
  -- Padres pueden crear pedidos para sus hijos
  (student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  ))
  OR
  -- Profesores pueden crear sus propios pedidos
  (teacher_id = auth.uid())
  OR
  -- Staff puede crear pedidos
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_general', 'gestor_unidad', 'operador_cocina')
  )
);

-- Policy 3: UPDATE - Actualizar pedidos
CREATE POLICY "Users can update lunch orders"
ON lunch_orders FOR UPDATE
TO authenticated
USING (
  -- Padres pueden actualizar pedidos de sus hijos
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
  OR
  -- Profesores pueden actualizar sus propios pedidos
  teacher_id = auth.uid()
  OR
  -- Staff puede actualizar cualquier pedido de su sede
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_general', 'gestor_unidad', 'operador_cocina')
      AND (
        p.role IN ('admin_general', 'supervisor_red')
        OR p.school_id = lunch_orders.school_id
      )
  )
);

-- ========================================
-- 3. VERIFICAR TRANSACCIONES DE PROFESORES
-- ========================================

-- Ver todas las compras a crédito de profesores (últimos 30 días)
SELECT 
  'COMPRAS PROFESORES (30 días)' as info,
  tp.full_name as profesor,
  t.created_at as fecha_compra,
  t.amount as monto,
  t.payment_method as metodo_pago,
  t.ticket_code as ticket,
  s.name as sede,
  p_created.full_name as cajero
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN schools s ON t.school_id = s.id
LEFT JOIN profiles p_created ON t.created_by = p_created.id
WHERE t.teacher_id IS NOT NULL
  AND t.created_at >= NOW() - INTERVAL '30 days'
ORDER BY t.created_at DESC
LIMIT 50;

-- Ver profesores con deuda pendiente
SELECT 
  'PROFESORES CON DEUDA' as info,
  tp.full_name as profesor,
  tp.personal_email,
  SUM(t.amount) as deuda_total,
  COUNT(*) as num_compras,
  MAX(t.created_at) as ultima_compra
FROM teacher_profiles tp
JOIN transactions t ON t.teacher_id = tp.id
WHERE t.payment_status = 'pending'
  AND t.amount < 0
GROUP BY tp.id, tp.full_name, tp.personal_email
ORDER BY deuda_total ASC;

-- ========================================
-- 4. VERIFICACIÓN FINAL
-- ========================================

SELECT 
  'RESUMEN FINAL' as info,
  (SELECT COUNT(*) FROM purchase_visibility_delay WHERE delay_days = 0) as sedes_sin_delay,
  (SELECT COUNT(*) FROM purchase_visibility_delay WHERE delay_days > 0) as sedes_con_delay,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'lunch_orders') as policies_lunch_orders,
  (SELECT COUNT(DISTINCT teacher_id) FROM transactions WHERE teacher_id IS NOT NULL) as profesores_con_compras;
