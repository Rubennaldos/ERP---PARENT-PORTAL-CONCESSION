-- ============================================
-- FIX: Agregar política RLS para INSERT en lunch_menus
-- ============================================
-- Fecha: 2026-02-05
-- Descripción: Permitir a usuarios autenticados (incluyendo cajeros) 
--              crear menús de almuerzo
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
WHERE tablename = 'lunch_menus'
ORDER BY cmd;

-- Eliminar política INSERT si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear menus" ON lunch_menus;

-- Crear política para INSERT
CREATE POLICY "Usuarios autenticados pueden crear menus"
ON lunch_menus
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
WHERE tablename = 'lunch_menus'
ORDER BY cmd;

-- ============================================
-- RESUMEN DE POLÍTICAS NECESARIAS:
-- ============================================
-- ✅ SELECT: Usuarios autenticados pueden ver menús
-- ✅ INSERT: Usuarios autenticados pueden crear menús (ESTA ES LA NUEVA)
-- ✅ UPDATE: Usuarios autenticados pueden actualizar menús
-- ✅ DELETE: Usuarios autenticados pueden eliminar menús
-- ============================================
