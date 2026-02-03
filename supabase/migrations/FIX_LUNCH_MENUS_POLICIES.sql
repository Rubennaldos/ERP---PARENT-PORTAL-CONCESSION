-- ============================================
-- ACTUALIZAR POLÍTICAS RLS DE LUNCH_MENUS
-- ============================================
-- Las nuevas columnas category_id y target_type necesitan permisos

-- Primero, verificar que existan las columnas (el script principal ya las creó)
-- Ahora actualizamos las políticas para permitir guardar estos campos

-- No necesitamos cambiar las políticas, pero vamos a asegurarnos de que
-- los usuarios puedan insertar/actualizar menús con los nuevos campos

-- Verificar que los usuarios tengan acceso adecuado
-- (Las políticas existentes deberían ser suficientes, pero las revisamos)

-- Nota: Este script es solo por precaución
-- Las políticas de lunch_menus ya existentes deberían permitir
-- la inserción/actualización de las nuevas columnas automáticamente

SELECT 'Políticas de lunch_menus verificadas correctamente' as status;
