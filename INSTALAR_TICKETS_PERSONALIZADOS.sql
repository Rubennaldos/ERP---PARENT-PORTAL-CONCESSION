-- ============================================================================
-- SISTEMA COMPLETO DE TICKETS CON PREFIJOS PERSONALIZADOS
-- ============================================================================

-- PASO 1: Eliminar funciones existentes
DROP FUNCTION IF EXISTS get_next_ticket_number(UUID);
DROP FUNCTION IF EXISTS reset_ticket_sequence(UUID);
DROP FUNCTION IF EXISTS generate_user_prefix(UUID);

-- PASO 2: Eliminar y recrear tabla
DROP TABLE IF EXISTS ticket_sequences CASCADE;

CREATE TABLE ticket_sequences (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_number INTEGER DEFAULT 0,
  prefix TEXT, -- Prefijo personalizado (ej: 'T-AG-', 'T-FL-')
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_ticket_sequences_profile_id ON ticket_sequences(profile_id);

-- PASO 3: Función para generar prefijo único basado en nombre del usuario
CREATE OR REPLACE FUNCTION generate_user_prefix(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_initials TEXT;
  v_prefix TEXT;
BEGIN
  -- Obtener datos del usuario
  SELECT full_name, email INTO v_full_name, v_email
  FROM profiles
  WHERE id = p_user_id;
  
  -- Si tiene nombre completo, usar iniciales
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    -- Extraer iniciales (primeras letras de cada palabra)
    SELECT string_agg(upper(substring(word, 1, 1)), '')
    INTO v_initials
    FROM unnest(string_to_array(v_full_name, ' ')) AS word
    LIMIT 2; -- Máximo 2 iniciales
    
    v_prefix := 'T-' || v_initials || '-';
  ELSE
    -- Si no tiene nombre, usar primeras letras del email
    v_prefix := 'T-' || upper(substring(split_part(v_email, '@', 1), 1, 2)) || '-';
  END IF;
  
  RETURN v_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Función para obtener siguiente ticket con prefijo personalizado
CREATE OR REPLACE FUNCTION get_next_ticket_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
  v_prefix TEXT;
  v_ticket_number TEXT;
BEGIN
  -- Obtener o crear prefijo personalizado
  SELECT prefix INTO v_prefix
  FROM ticket_sequences
  WHERE profile_id = p_user_id;
  
  -- Si no existe, generar prefijo personalizado
  IF NOT FOUND THEN
    v_prefix := generate_user_prefix(p_user_id);
    
    INSERT INTO ticket_sequences (profile_id, current_number, prefix)
    VALUES (p_user_id, 1, v_prefix)
    RETURNING current_number INTO v_number;
  ELSE
    -- Incrementar contador
    UPDATE ticket_sequences
    SET 
      current_number = current_number + 1,
      updated_at = NOW()
    WHERE profile_id = p_user_id
    RETURNING current_number INTO v_number;
  END IF;
  
  -- Formatear número (ej: T-AG-000001)
  v_ticket_number := v_prefix || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Función para resetear secuencia
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

-- PASO 6: Dar permisos
GRANT EXECUTE ON FUNCTION generate_user_prefix TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_ticket_number TO authenticated;
GRANT EXECUTE ON FUNCTION reset_ticket_sequence TO authenticated;

-- PASO 7: Verificar instalación
SELECT '✅ Sistema de tickets con prefijos personalizados instalado' as status;

-- Mostrar estructura de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ticket_sequences'
ORDER BY ordinal_position;

-- PASO 8: Prueba de ejemplo
DO $$
DECLARE
  v_test_user_id UUID;
  v_test_ticket TEXT;
BEGIN
  -- Obtener el primer usuario (SuperAdmin probablemente)
  SELECT id INTO v_test_user_id
  FROM profiles
  WHERE email = 'superadmin@limacafe28.com'
  LIMIT 1;
  
  IF v_test_user_id IS NOT NULL THEN
    -- Generar ticket de prueba
    SELECT get_next_ticket_number(v_test_user_id) INTO v_test_ticket;
    RAISE NOTICE '🎫 Ticket de prueba generado: %', v_test_ticket;
  END IF;
END $$;
