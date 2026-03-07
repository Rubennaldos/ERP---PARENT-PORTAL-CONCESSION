-- =============================================
-- MODO MANTENIMIENTO POR MÓDULO
-- Permite poner en mantenimiento módulos específicos
-- con lista de correos que pueden saltarse la restricción
-- =============================================

CREATE TABLE IF NOT EXISTS public.module_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(50) NOT NULL UNIQUE,  -- ej: 'parent_lunch'
  module_name VARCHAR(100) NOT NULL,        -- ej: 'Almuerzos (Portal Padres)'
  is_active BOOLEAN DEFAULT FALSE,          -- true = en mantenimiento
  title TEXT DEFAULT '🔧 Módulo en Mantenimiento',
  message TEXT DEFAULT 'Estamos trabajando para mejorar esta sección. Estará disponible pronto.',
  bypass_emails TEXT[] DEFAULT '{}',        -- correos que pueden ver el módulo aunque esté en mantenimiento
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.module_maintenance ENABLE ROW LEVEL SECURITY;

-- Todos (incluyendo padres) pueden LEER para verificar si está en mantenimiento
DROP POLICY IF EXISTS "public_read_module_maintenance" ON public.module_maintenance;
CREATE POLICY "public_read_module_maintenance" ON public.module_maintenance
  FOR SELECT USING (true);

-- Solo admins pueden modificar
DROP POLICY IF EXISTS "admins_manage_module_maintenance" ON public.module_maintenance;
CREATE POLICY "admins_manage_module_maintenance" ON public.module_maintenance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('superadmin', 'admin_general', 'gestor_unidad', 'admin')
    )
  );

-- Insertar configuración inicial para el módulo de almuerzos
INSERT INTO public.module_maintenance (module_key, module_name, is_active, title, message, bypass_emails)
VALUES (
  'parent_lunch',
  'Almuerzos (Portal Padres)',
  false,
  '🔧 Módulo de Almuerzos en Mantenimiento',
  'Estamos preparando el módulo de almuerzos para ofrecerte la mejor experiencia. Pronto podrás realizar tus pedidos. ¡Gracias por tu paciencia!',
  ARRAY[]::TEXT[]
)
ON CONFLICT (module_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
