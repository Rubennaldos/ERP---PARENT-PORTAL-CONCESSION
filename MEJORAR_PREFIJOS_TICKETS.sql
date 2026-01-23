-- ============================================================================
-- MEJORAR SISTEMA DE TICKETS CON PREFIJOS PERSONALIZADOS
-- ============================================================================

-- Función para generar prefijo único basado en nombre del usuario
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

-- Actualizar función de tickets para usar prefijo personalizado
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

-- Permisos
GRANT EXECUTE ON FUNCTION generate_user_prefix TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_ticket_number TO authenticated;

-- Verificar
SELECT '✅ Sistema de prefijos personalizados actualizado' as status;

-- Ejemplo de cómo se verían los tickets:
SELECT 
  'superadmin@limacafe28.com' as usuario,
  generate_user_prefix(id) || '000001' as ejemplo_ticket
FROM profiles
WHERE email = 'superadmin@limacafe28.com'
LIMIT 1;
