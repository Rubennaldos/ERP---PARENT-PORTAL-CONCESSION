-- =====================================================
-- INVESTIGAR QUIÉN ESTÁ CREANDO LAS TRANSACCIONES DUPLICADAS
-- =====================================================

-- 1️⃣ Ver TODAS las transacciones del 8/2 con QUIÉN las creó
SELECT 
  '🔍 TRANSACCIONES 8/2 CON CREADOR' as investigacion,
  t.id,
  tp.full_name as profesor,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as fecha_hora_creacion,
  t.created_by,
  p.full_name as creado_por_usuario,
  p.email as email_creador,
  p.role as rol_creador,
  t.payment_status,
  t.payment_method
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE DATE(t.created_at) = '2026-02-08'
  AND t.teacher_id IS NOT NULL
  AND t.description ILIKE '%8 de febrero%'
ORDER BY tp.full_name, t.created_at;

-- 2️⃣ Contar cuántas transacciones del 8/2 tiene cada profesor
SELECT 
  '📊 DUPLICADOS DEL 8/2' as tipo,
  tp.full_name as profesor,
  COUNT(*) as cantidad_transacciones_8_feb,
  SUM(t.amount) as total_deuda,
  STRING_AGG(DISTINCT TO_CHAR(t.created_at, 'HH24:MI:SS'), ' | ') as horas_creacion,
  STRING_AGG(DISTINCT p.full_name, ' | ') as creadores
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE DATE(t.created_at) = '2026-02-08'
  AND t.description ILIKE '%8 de febrero%'
GROUP BY tp.id, tp.full_name
HAVING COUNT(*) > 1
ORDER BY cantidad_transacciones_8_feb DESC, tp.full_name;

-- 3️⃣ Ver si hay un patrón de HORA o USUARIO que creó los duplicados
SELECT 
  '⏰ PATRÓN DE CREACIÓN' as analisis,
  TO_CHAR(t.created_at, 'HH24:MI') as hora,
  COUNT(*) as cantidad_transacciones,
  COUNT(DISTINCT t.teacher_id) as profesores_afectados,
  STRING_AGG(DISTINCT p.full_name, ', ') as creadores,
  STRING_AGG(DISTINCT p.role, ', ') as roles
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
WHERE DATE(t.created_at) = '2026-02-08'
  AND t.description ILIKE '%8 de febrero%'
GROUP BY TO_CHAR(t.created_at, 'HH24:MI')
ORDER BY hora;

-- 4️⃣ Ver si hay transacciones SIN created_by (creadas por el sistema)
SELECT 
  '🤖 TRANSACCIONES SIN CREADOR (SISTEMA)' as tipo,
  COUNT(*) as cantidad,
  STRING_AGG(DISTINCT TO_CHAR(t.created_at, 'HH24:MI'), ', ') as horas
FROM transactions t
WHERE DATE(t.created_at) = '2026-02-08'
  AND t.teacher_id IS NOT NULL
  AND t.created_by IS NULL
  AND t.description ILIKE '%8 de febrero%';

-- 5️⃣ Ver las primeras 10 transacciones duplicadas con todos los detalles
SELECT 
  '🚨 EJEMPLOS DE DUPLICADOS' as tipo,
  tp.full_name as profesor,
  t.description,
  t.amount,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as creado_el,
  COALESCE(p.full_name, '🤖 SISTEMA') as creado_por,
  COALESCE(p.email, 'N/A') as email_creador
FROM transactions t
JOIN teacher_profiles tp ON t.teacher_id = tp.id
LEFT JOIN profiles p ON t.created_by = p.id
WHERE DATE(t.created_at) = '2026-02-08'
  AND t.description ILIKE '%8 de febrero%'
  AND t.teacher_id IN (
    SELECT teacher_id 
    FROM transactions 
    WHERE DATE(created_at) = '2026-02-08'
      AND description ILIKE '%8 de febrero%'
    GROUP BY teacher_id
    HAVING COUNT(*) > 1
  )
ORDER BY tp.full_name, t.created_at
LIMIT 20;
