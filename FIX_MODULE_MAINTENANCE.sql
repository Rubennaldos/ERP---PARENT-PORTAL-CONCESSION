-- =============================================
-- MODO MANTENIMIENTO POR MÓDULO
-- Ejecuta este SQL en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.module_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(50) NOT NULL UNIQUE,
  module_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  title TEXT DEFAULT '🔧 Módulo en Mantenimiento',
  message TEXT DEFAULT 'Estamos trabajando para mejorar esta sección. Estará disponible pronto.',
  bypass_emails TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.module_maintenance ENABLE ROW LEVEL SECURITY;

-- Todos pueden LEER (para que el frontend verifique el estado)
DROP POLICY IF EXISTS "public_read_module_maintenance" ON public.module_maintenance;
CREATE POLICY "public_read_module_maintenance" ON public.module_maintenance
  FOR SELECT USING (true);

-- Cualquier usuario autenticado puede modificar
-- (la página de admin ya está protegida por roles en el frontend)
DROP POLICY IF EXISTS "auth_manage_module_maintenance" ON public.module_maintenance;
CREATE POLICY "auth_manage_module_maintenance" ON public.module_maintenance
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insertar configuración inicial
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
