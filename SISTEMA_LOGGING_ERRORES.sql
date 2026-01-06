-- =========================================
-- SISTEMA DE LOGGING Y ANÁLISIS DE ERRORES
-- Registra todos los errores del sistema y permite
-- análisis en el panel de SuperAdmin
-- =========================================

-- Tabla de logs de errores
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  
  -- Información del error
  error_type TEXT NOT NULL, -- 'auth', 'database', 'validation', 'network', 'unknown'
  error_code TEXT, -- Código técnico del error
  error_message TEXT NOT NULL, -- Mensaje original del error
  error_translated TEXT, -- Mensaje traducido para el usuario
  
  -- Contexto del error
  page_url TEXT, -- URL donde ocurrió
  component TEXT, -- Componente React donde ocurrió
  action TEXT, -- Acción que se estaba realizando
  user_agent TEXT, -- Navegador del usuario
  
  -- Datos adicionales
  stack_trace TEXT, -- Stack trace completo (opcional)
  metadata JSONB, -- Datos adicionales en formato JSON
  
  -- Estado
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_page_url ON error_logs(page_url);
CREATE INDEX IF NOT EXISTS idx_error_logs_is_resolved ON error_logs(is_resolved);

-- Vista para estadísticas de errores
CREATE OR REPLACE VIEW error_statistics AS
SELECT 
  error_type,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as affected_users,
  MAX(created_at) as last_occurrence,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600)::numeric, 2) as avg_hours_ago
FROM error_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY error_type
ORDER BY total_count DESC;

-- Vista para puntos de bloqueo (páginas con más errores)
CREATE OR REPLACE VIEW error_hotspots AS
SELECT 
  page_url,
  component,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  ARRAY_AGG(DISTINCT error_type) as error_types,
  MAX(created_at) as last_occurrence
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY page_url, component
ORDER BY error_count DESC
LIMIT 20;

-- Vista para errores más frecuentes
CREATE OR REPLACE VIEW most_frequent_errors AS
SELECT 
  error_message,
  error_translated,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as affected_users,
  MAX(created_at) as last_seen,
  page_url,
  component
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY error_message, error_translated, page_url, component
ORDER BY occurrences DESC
LIMIT 50;

-- RLS Policies (solo SuperAdmin puede ver)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SuperAdmin can view all error logs" ON error_logs;
CREATE POLICY "SuperAdmin can view all error logs"
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = 'superadmin@limacafe28.com'
    )
  );

DROP POLICY IF EXISTS "Anyone can insert error logs" ON error_logs;
CREATE POLICY "Anyone can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "SuperAdmin can update error logs" ON error_logs;
CREATE POLICY "SuperAdmin can update error logs"
  ON error_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = 'superadmin@limacafe28.com'
    )
  );

-- Permisos
GRANT SELECT ON error_statistics TO authenticated;
GRANT SELECT ON error_hotspots TO authenticated;
GRANT SELECT ON most_frequent_errors TO authenticated;

-- Comentarios
COMMENT ON TABLE error_logs IS 'Registro de todos los errores del sistema para análisis y debugging';
COMMENT ON VIEW error_statistics IS 'Estadísticas de errores de los últimos 30 días';
COMMENT ON VIEW error_hotspots IS 'Páginas/componentes con más errores en los últimos 7 días';
COMMENT ON VIEW most_frequent_errors IS 'Errores más frecuentes en los últimos 7 días';

