-- 🔒 CREAR POLÍTICAS RLS PARA CASH_REGISTER_CONFIG

-- ===================================================================
-- Verificar políticas actuales
-- ===================================================================
SELECT 
  '🔍 Políticas actuales' as info,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'cash_register_config';

-- ===================================================================
-- Habilitar RLS si no está habilitado
-- ===================================================================
ALTER TABLE cash_register_config ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Eliminar políticas antiguas si existen
-- ===================================================================
DROP POLICY IF EXISTS "cash_config_select" ON cash_register_config;
DROP POLICY IF EXISTS "cash_config_insert" ON cash_register_config;
DROP POLICY IF EXISTS "cash_config_update" ON cash_register_config;

-- ===================================================================
-- CREAR POLÍTICAS CORRECTAS
-- ===================================================================

-- 1. Admin General: acceso total
CREATE POLICY "Admin general - acceso total a config"
ON cash_register_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin_general'
  )
);

-- 2. Operador de Caja: puede VER y ACTUALIZAR su sede
CREATE POLICY "Operador caja - ver config de su sede"
ON cash_register_config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'operador_caja'
      AND p.school_id = cash_register_config.school_id
  )
);

-- 3. Gestor Unidad (Admin por Sede): acceso total a su sede
CREATE POLICY "Gestor unidad - acceso total a config de su sede"
ON cash_register_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'gestor_unidad'
      AND p.school_id = cash_register_config.school_id
  )
);

-- ===================================================================
-- Verificar políticas creadas
-- ===================================================================
SELECT 
  '✅ Políticas creadas' as resultado,
  policyname,
  cmd as operacion,
  CASE 
    WHEN cmd = 'ALL' THEN '📝 Todas'
    WHEN cmd = 'SELECT' THEN '👁️ Ver'
    WHEN cmd = 'INSERT' THEN '➕ Crear'
    WHEN cmd = 'UPDATE' THEN '✏️ Editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Eliminar'
  END as tipo
FROM pg_policies
WHERE tablename = 'cash_register_config'
ORDER BY policyname;
