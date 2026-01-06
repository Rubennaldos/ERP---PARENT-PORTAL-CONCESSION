-- PASO 1: Eliminar trigger existente
DROP TRIGGER IF EXISTS trigger_update_weekly_menus_updated_at ON weekly_menus CASCADE;

-- PASO 2: Eliminar función existente
DROP FUNCTION IF EXISTS update_weekly_menus_updated_at() CASCADE;

