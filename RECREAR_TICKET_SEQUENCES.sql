-- ============================================================================
-- LIMPIAR Y RECREAR SISTEMA DE TICKETS DESDE CERO
-- ============================================================================

-- PASO 1: Eliminar funciones
DROP FUNCTION IF EXISTS get_next_ticket_number(UUID);
DROP FUNCTION IF EXISTS reset_ticket_sequence(UUID);

-- PASO 2: Eliminar tabla
DROP TABLE IF EXISTS ticket_sequences CASCADE;

-- PASO 3: Crear tabla desde cero
CREATE TABLE ticket_sequences (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_number INTEGER DEFAULT 0,
  prefix TEXT DEFAULT 'T',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_ticket_sequences_profile_id ON ticket_sequences(profile_id);

-- PASO 4: Función para obtener siguiente número
CREATE FUNCTION get_next_ticket_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
  v_prefix TEXT;
  v_ticket_number TEXT;
BEGIN
  -- Incrementar contador
  UPDATE ticket_sequences
  SET 
    current_number = current_number + 1,
    updated_at = NOW()
  WHERE profile_id = p_user_id
  RETURNING current_number, prefix INTO v_number, v_prefix;
  
  -- Si no existe, crear
  IF NOT FOUND THEN
    INSERT INTO ticket_sequences (profile_id, current_number, prefix)
    VALUES (p_user_id, 1, 'T')
    RETURNING current_number, prefix INTO v_number, v_prefix;
  END IF;
  
  -- Formatear (ej: T000001)
  v_ticket_number := v_prefix || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Función para resetear
CREATE FUNCTION reset_ticket_sequence(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ticket_sequences
  SET 
    current_number = 0,
    updated_at = NOW()
  WHERE profile_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: Dar permisos
GRANT EXECUTE ON FUNCTION get_next_ticket_number TO authenticated;
GRANT EXECUTE ON FUNCTION reset_ticket_sequence TO authenticated;

-- PASO 7: Verificar
SELECT '✅ Sistema de tickets recreado exitosamente' as status;

-- Mostrar estructura
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ticket_sequences'
ORDER BY ordinal_position;
