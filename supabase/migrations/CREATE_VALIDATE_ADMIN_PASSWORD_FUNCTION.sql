-- =====================================================
-- Función para validar contraseña de administrador
-- Permite a cajeros solicitar autorización para anular ventas
-- =====================================================

-- Eliminar función si existe
DROP FUNCTION IF EXISTS validate_admin_password(text);

-- Crear función
CREATE OR REPLACE FUNCTION validate_admin_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role varchar;
BEGIN
  -- Buscar un usuario con rol admin_general o gestor_unidad que tenga esa contraseña
  SELECT 
    au.id,
    p.role
  INTO 
    v_user_id,
    v_role
  FROM auth.users au
  INNER JOIN profiles p ON p.id = au.id
  WHERE 
    au.encrypted_password = crypt(p_password, au.encrypted_password)
    AND p.role IN ('admin_general', 'gestor_unidad')
    AND au.deleted_at IS NULL
  LIMIT 1;

  -- Si encontró un admin con esa contraseña, retornar true
  IF v_user_id IS NOT NULL THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION validate_admin_password(text) TO authenticated;

-- Comentario
COMMENT ON FUNCTION validate_admin_password IS 'Valida si una contraseña corresponde a un administrador activo';
