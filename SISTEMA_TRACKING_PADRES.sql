-- =====================================================
-- SISTEMA DE TRACKING Y ANALYTICS PARA PADRES
-- Lima Analytics Design System
-- =====================================================

-- 1. TABLA DE EVENTOS DE ACTIVIDAD
CREATE TABLE IF NOT EXISTS parent_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'view_page', 'payment', 'recharge', 'update_profile', etc.
  event_category TEXT NOT NULL, -- 'authentication', 'payment', 'navigation', 'configuration'
  event_data JSONB, -- Datos adicionales del evento
  session_id TEXT, -- Para agrupar eventos de una misma sesión
  duration_seconds INTEGER, -- Duración del evento (para páginas)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parent_activity_log_parent ON parent_activity_log(parent_id);
CREATE INDEX idx_parent_activity_log_event ON parent_activity_log(event_type);
CREATE INDEX idx_parent_activity_log_created ON parent_activity_log(created_at);

-- 2. TABLA DE SESIONES
CREATE TABLE IF NOT EXISTS parent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  pages_viewed INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  device_info JSONB
);

CREATE INDEX idx_parent_sessions_parent ON parent_sessions(parent_id);
CREATE INDEX idx_parent_sessions_started ON parent_sessions(started_at);

-- 3. FUNCIÓN PARA REGISTRAR ACTIVIDAD (llamar desde el frontend)
CREATE OR REPLACE FUNCTION log_parent_activity(
  p_parent_id UUID,
  p_event_type TEXT,
  p_event_category TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO parent_activity_log (
    parent_id, 
    event_type, 
    event_category, 
    event_data, 
    session_id, 
    duration_seconds
  )
  VALUES (
    p_parent_id, 
    p_event_type, 
    p_event_category, 
    p_event_data, 
    p_session_id, 
    p_duration_seconds
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN PARA OBTENER MÉTRICAS DE UN PADRE
CREATE OR REPLACE FUNCTION get_parent_metrics(p_parent_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_logins BIGINT,
  total_payments BIGINT,
  total_recharges BIGINT,
  avg_session_duration_minutes NUMERIC,
  total_pages_viewed BIGINT,
  last_login TIMESTAMP WITH TIME ZONE,
  engagement_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT CASE WHEN pal.event_type = 'login' THEN pal.id END) as total_logins,
    COUNT(DISTINCT CASE WHEN pal.event_type = 'payment' THEN pal.id END) as total_payments,
    COUNT(DISTINCT CASE WHEN pal.event_type = 'recharge' THEN pal.id END) as total_recharges,
    COALESCE(AVG(ps.duration_seconds) / 60.0, 0)::NUMERIC(10,2) as avg_session_duration_minutes,
    COALESCE(SUM(ps.pages_viewed), 0) as total_pages_viewed,
    MAX(pal.created_at) as last_login,
    (
      -- Score de engagement: logins * 2 + pagos * 10 + páginas vistas * 0.5
      (COUNT(DISTINCT CASE WHEN pal.event_type = 'login' THEN pal.id END) * 2) +
      (COUNT(DISTINCT CASE WHEN pal.event_type = 'payment' THEN pal.id END) * 10) +
      (COALESCE(SUM(ps.pages_viewed), 0) * 0.5)
    )::NUMERIC(10,2) as engagement_score
  FROM parent_activity_log pal
  LEFT JOIN parent_sessions ps ON ps.parent_id = pal.parent_id
  WHERE pal.parent_id = p_parent_id
    AND pal.created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN PARA OBTENER TIMELINE DE ACTIVIDAD
CREATE OR REPLACE FUNCTION get_parent_activity_timeline(
  p_parent_id UUID, 
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  event_category TEXT,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pal.id,
    pal.event_type,
    pal.event_category,
    pal.event_data,
    pal.created_at
  FROM parent_activity_log pal
  WHERE pal.parent_id = p_parent_id
  ORDER BY pal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN PARA REPORTE GENERAL DE TODOS LOS PADRES
CREATE OR REPLACE FUNCTION get_all_parents_report()
RETURNS TABLE (
  parent_id UUID,
  parent_name TEXT,
  parent_email TEXT,
  total_students INTEGER,
  total_logins BIGINT,
  avg_session_minutes NUMERIC,
  total_payments BIGINT,
  total_amount_paid NUMERIC,
  engagement_score NUMERIC,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as parent_id,
    p.full_name as parent_name,
    p.email as parent_email,
    COUNT(DISTINCT s.id)::INTEGER as total_students,
    COUNT(DISTINCT CASE WHEN pal.event_type = 'login' THEN pal.id END) as total_logins,
    COALESCE(AVG(ps.duration_seconds) / 60.0, 0)::NUMERIC(10,2) as avg_session_minutes,
    COUNT(DISTINCT CASE WHEN pal.event_type = 'payment' THEN pal.id END) as total_payments,
    COALESCE(SUM(CASE WHEN t.type IN ('payment', 'recharge') THEN t.amount ELSE 0 END), 0)::NUMERIC(10,2) as total_amount_paid,
    (
      (COUNT(DISTINCT CASE WHEN pal.event_type = 'login' THEN pal.id END) * 2) +
      (COUNT(DISTINCT CASE WHEN pal.event_type = 'payment' THEN pal.id END) * 10) +
      (COALESCE(SUM(ps.pages_viewed), 0) * 0.5)
    )::NUMERIC(10,2) as engagement_score,
    MAX(pal.created_at) as last_activity
  FROM profiles p
  LEFT JOIN students s ON s.parent_id = p.id AND s.is_active = true
  LEFT JOIN parent_activity_log pal ON pal.parent_id = p.id
  LEFT JOIN parent_sessions ps ON ps.parent_id = p.id
  LEFT JOIN transactions t ON t.created_by = p.id
  WHERE p.role = 'parent'
  GROUP BY p.id, p.full_name, p.email
  ORDER BY engagement_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. PERMISOS
GRANT EXECUTE ON FUNCTION log_parent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_parent_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_parent_activity_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_parents_report TO authenticated;

-- 8. POLÍTICAS RLS
ALTER TABLE parent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los padres pueden ver su propia actividad"
  ON parent_activity_log FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Los admins pueden ver toda la actividad"
  ON parent_activity_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'admin_sede')
    )
  );

CREATE POLICY "Sistema puede insertar actividad"
  ON parent_activity_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Los padres pueden ver sus propias sesiones"
  ON parent_sessions FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Los admins pueden ver todas las sesiones"
  ON parent_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_general', 'admin_sede')
    )
  );

-- ✅ LISTO: Sistema de tracking completo
-- Ahora podemos capturar y analizar el comportamiento de los padres
