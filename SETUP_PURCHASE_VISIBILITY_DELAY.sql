-- ============================================================================
-- SISTEMA DE DELAY DE VISUALIZACIÓN DE COMPRAS
-- ============================================================================
-- Propósito: Permitir que las compras se muestren con X días de retraso
-- para dar tiempo al kiosco a pasar las ventas del cuaderno al sistema
-- y evitar reclamos de padres por "deudas que aparecen después de pagar"
-- ============================================================================

-- PASO 1: Crear tabla de configuración
CREATE TABLE IF NOT EXISTS purchase_visibility_delay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  delay_days INTEGER NOT NULL DEFAULT 2, -- Días de retraso (0 = en vivo)
  applies_to TEXT NOT NULL DEFAULT 'purchases', -- 'purchases', 'recharges', 'all'
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Una configuración por sede
  UNIQUE(school_id)
);

-- Índices
CREATE INDEX idx_purchase_visibility_school ON purchase_visibility_delay(school_id);

-- PASO 2: RLS Policies
ALTER TABLE purchase_visibility_delay ENABLE ROW LEVEL SECURITY;

-- Admin General y SuperAdmin pueden ver y editar todas las configuraciones
CREATE POLICY "Admin General puede ver todas las configuraciones"
  ON purchase_visibility_delay
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin_general', 'superadmin')
    )
  );

CREATE POLICY "Admin General puede editar todas las configuraciones"
  ON purchase_visibility_delay
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin_general', 'superadmin')
    )
  );

-- Gestor de Unidad puede ver y editar solo su sede
CREATE POLICY "Gestor de Unidad puede ver su configuración"
  ON purchase_visibility_delay
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor_unidad'
    )
  );

CREATE POLICY "Gestor de Unidad puede editar su configuración"
  ON purchase_visibility_delay
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor_unidad'
    )
  );

-- PASO 3: Función para obtener el delay de una sede
CREATE OR REPLACE FUNCTION get_purchase_visibility_delay(p_school_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_delay INTEGER;
BEGIN
  -- Obtener el delay configurado para la sede
  SELECT delay_days INTO v_delay
  FROM purchase_visibility_delay
  WHERE school_id = p_school_id;
  
  -- Si no existe configuración, retornar 2 días por defecto
  IF NOT FOUND THEN
    RETURN 2;
  END IF;
  
  RETURN v_delay;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Función para obtener fecha límite de visualización
CREATE OR REPLACE FUNCTION get_visibility_cutoff_date(p_school_id UUID)
RETURNS TIMESTAMP AS $$
DECLARE
  v_delay INTEGER;
  v_cutoff_date TIMESTAMP;
BEGIN
  -- Obtener delay de la sede
  v_delay := get_purchase_visibility_delay(p_school_id);
  
  -- Calcular fecha límite (hoy - delay_days)
  v_cutoff_date := NOW() - (v_delay || ' days')::INTERVAL;
  
  RETURN v_cutoff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Insertar configuraciones por defecto para todas las sedes existentes
INSERT INTO purchase_visibility_delay (school_id, delay_days, applies_to)
SELECT 
  id,
  2, -- 2 días por defecto
  'purchases' -- Solo aplica a compras, no a recargas
FROM schools
WHERE is_active = true
ON CONFLICT (school_id) DO NOTHING;

-- PASO 6: Permisos
GRANT EXECUTE ON FUNCTION get_purchase_visibility_delay TO authenticated;
GRANT EXECUTE ON FUNCTION get_visibility_cutoff_date TO authenticated;

-- PASO 7: Verificar instalación
SELECT '✅ Sistema de delay de visualización instalado correctamente' as status;

-- Mostrar configuraciones actuales
SELECT 
  s.name as sede,
  pvd.delay_days as dias_retraso,
  pvd.applies_to as aplica_a,
  pvd.created_at as creado
FROM purchase_visibility_delay pvd
JOIN schools s ON s.id = pvd.school_id
ORDER BY s.name;
