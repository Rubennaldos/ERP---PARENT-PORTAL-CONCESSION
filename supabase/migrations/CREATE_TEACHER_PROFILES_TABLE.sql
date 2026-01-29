-- =====================================================
-- TABLA DE PERFILES DE PROFESORES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  dni VARCHAR(20) UNIQUE,
  corporate_email VARCHAR(255),
  personal_email VARCHAR(255),
  phone_1 VARCHAR(20),
  corporate_phone VARCHAR(20),
  area VARCHAR(50), -- 'profesor', 'administrador', 'personal', 'otro'
  school_id_1 UUID REFERENCES public.schools(id), -- Primera escuela (obligatoria)
  school_id_2 UUID REFERENCES public.schools(id), -- Segunda escuela (opcional)
  free_account BOOLEAN DEFAULT true, -- Siempre true para profesores
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school_id_1 ON public.teacher_profiles(school_id_1);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school_id_2 ON public.teacher_profiles(school_id_2);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_dni ON public.teacher_profiles(dni);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_area ON public.teacher_profiles(area);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_onboarding ON public.teacher_profiles(onboarding_completed);

-- Comentarios
COMMENT ON TABLE public.teacher_profiles IS 'Perfiles de profesores y personal educativo';
COMMENT ON COLUMN public.teacher_profiles.area IS 'Área de trabajo: profesor, administrador, personal, otro';
COMMENT ON COLUMN public.teacher_profiles.school_id_1 IS 'Primera escuela asignada (obligatoria)';
COMMENT ON COLUMN public.teacher_profiles.school_id_2 IS 'Segunda escuela asignada (opcional)';
COMMENT ON COLUMN public.teacher_profiles.free_account IS 'Cuenta libre sin límites (siempre true para profesores)';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_teacher_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_profiles_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Profesores pueden ver y editar su propio perfil
CREATE POLICY "Teachers can view their own profile"
  ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Teachers can update their own profile"
  ON public.teacher_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Admins y cajeros pueden ver todos los profesores
CREATE POLICY "Admins and cashiers can view all teachers"
  ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'operador_caja', 'gestor_unidad', 'supervisor_red')
    )
  );

-- Política: Solo admins pueden crear profesores
CREATE POLICY "Only admins can create teachers"
  ON public.teacher_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general')
    )
  );

-- Política: Solo admins pueden eliminar profesores
CREATE POLICY "Only admins can delete teachers"
  ON public.teacher_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO authenticated;

-- =====================================================
-- VISTA PARA CONSULTAS CON INFORMACIÓN DE ESCUELAS
-- =====================================================

CREATE OR REPLACE VIEW public.teacher_profiles_with_schools AS
SELECT 
  tp.id,
  tp.full_name,
  tp.dni,
  tp.corporate_email,
  tp.personal_email,
  tp.phone_1,
  tp.corporate_phone,
  tp.area,
  tp.free_account,
  tp.onboarding_completed,
  tp.created_at,
  tp.updated_at,
  -- Info de la primera escuela
  s1.id as school_1_id,
  s1.name as school_1_name,
  s1.code as school_1_code,
  -- Info de la segunda escuela
  s2.id as school_2_id,
  s2.name as school_2_name,
  s2.code as school_2_code
FROM public.teacher_profiles tp
LEFT JOIN public.schools s1 ON tp.school_id_1 = s1.id
LEFT JOIN public.schools s2 ON tp.school_id_2 = s2.id;

-- RLS para la vista
ALTER VIEW public.teacher_profiles_with_schools SET (security_invoker = true);

GRANT SELECT ON public.teacher_profiles_with_schools TO authenticated;

-- =====================================================
-- AGREGAR ROL 'teacher' A LA TABLA profiles
-- =====================================================

-- Actualizar el check constraint de roles en la tabla profiles
-- (Solo si no existe ya el constraint con 'teacher')

DO $$
BEGIN
  -- Verificar si el constraint existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    -- Eliminar el constraint viejo
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Crear el nuevo constraint con 'teacher' incluido
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN (
      'superadmin', 
      'admin_general', 
      'gestor_unidad', 
      'almacenero', 
      'operador_caja', 
      'operador_cocina', 
      'supervisor_red', 
      'parent',
      'teacher'  -- ⬅️ NUEVO ROL
    ));
END $$;

-- =====================================================
-- ✅ TABLA Y ROL CREADOS EXITOSAMENTE
-- =====================================================

COMMENT ON TABLE public.teacher_profiles IS 
'Tabla de perfiles de profesores con soporte para hasta 2 escuelas. 
Cuentas libres sin límites. Para uso en POS y portal del profesor.';
