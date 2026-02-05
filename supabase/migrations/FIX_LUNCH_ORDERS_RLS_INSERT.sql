-- ============================================
-- FIX: Agregar política RLS para INSERT en lunch_orders
-- ============================================
-- Fecha: 2026-02-05
-- Descripción: Permitir a usuarios autenticados (incluyendo cajeros) 
--              crear pedidos de almuerzo
-- ============================================

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'lunch_orders'
ORDER BY cmd;

-- Eliminar política INSERT si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear pedidos" ON lunch_orders;

-- Crear política para INSERT
CREATE POLICY "Usuarios autenticados pueden crear pedidos"
ON lunch_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'lunch_orders'
ORDER BY cmd;

-- ============================================
-- RESUMEN DE POLÍTICAS NECESARIAS:
-- ============================================
-- ✅ SELECT: Usuarios autenticados pueden ver pedidos
-- ✅ INSERT: Usuarios autenticados pueden crear pedidos (ESTA ES LA NUEVA)
-- ✅ UPDATE: Usuarios autenticados pueden actualizar pedidos
-- ✅ DELETE: Usuarios autenticados pueden eliminar pedidos
-- ============================================
