-- ============================================================================
-- TABLA DE SECUENCIAS DE TICKETS POR USUARIO (ADMIN GENERAL)
-- ============================================================================

-- Crear tabla para almacenar secuencias de tickets
CREATE TABLE IF NOT EXISTS ticket_sequences (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_number INTEGER DEFAULT 0,
  prefix TEXT DEFAULT 'T',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ticket_sequences_profile_id ON ticket_sequences(profile_id);

-- ============================================================================
-- FUNCIÓN PARA OBTENER EL SIGUIENTE NÚMERO DE TICKET
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_ticket_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
  v_prefix TEXT;
  v_ticket_number TEXT;
BEGIN
  -- Intentar incrementar el contador existente
  UPDATE ticket_sequences
  SET 
    current_number = current_number + 1,
    updated_at = NOW()
  WHERE profile_id = p_user_id
  RETURNING current_number, prefix INTO v_number, v_prefix;
  
  -- Si no existe registro para este usuario, crear uno
  IF NOT FOUND THEN
    INSERT INTO ticket_sequences (profile_id, current_number, prefix)
    VALUES (p_user_id, 1, 'T')
    RETURNING current_number, prefix INTO v_number, v_prefix;
  END IF;
  
  -- Formatear número de ticket (ej: T000001, T000123)
  v_ticket_number := v_prefix || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_next_ticket_number TO authenticated;

-- ============================================================================
-- FUNCIÓN PARA RESETEAR SECUENCIA (OPCIONAL)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_ticket_sequence(p_user_id UUID)
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

GRANT EXECUTE ON FUNCTION reset_ticket_sequence TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT '✅ Sistema de secuencias de tickets creado correctamente' as status;

-- Mostrar tabla
SELECT * FROM ticket_sequences LIMIT 5;
