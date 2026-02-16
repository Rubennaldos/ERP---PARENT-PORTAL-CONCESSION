-- ============================================
-- 🔍 DIAGNÓSTICO COMPLETO: VENTAS POR SEDE
-- ============================================
-- Problema: La administradora de una sede dice que no ve ventas desde el 4 de febrero
-- Vamos a investigar:
-- 1. Qué sedes existen y sus IDs
-- 2. Qué cajeros/operadores hay por sede
-- 3. Cuántas ventas hay por sede y por día
-- 4. Ventas con school_id = NULL (problema conocido)
-- 5. Correlativos de tickets
-- ============================================

-- ============================================
-- PASO 1: VER TODAS LAS SEDES Y SUS IDS
-- ============================================
SELECT 
  id,
  name,
  code,
  created_at
FROM schools
ORDER BY name;

-- ============================================
-- PASO 2: VER TODOS LOS CAJEROS/OPERADORES POR SEDE
-- ============================================
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  p.school_id,
  p.pos_number,
  p.ticket_prefix,
  s.name as nombre_sede,
  s.code as codigo_sede
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
WHERE p.role IN ('operador_caja', 'cajero', 'pos', 'admin_sede', 'gestor_sede')
ORDER BY s.name, p.role, p.email;

-- ============================================
-- PASO 3: VENTAS POR SEDE Y POR DÍA (desde 1 de febrero)
-- ============================================
SELECT 
  DATE(t.created_at AT TIME ZONE 'America/Lima') as fecha,
  COALESCE(s.name, '❌ SIN SEDE (school_id NULL)') as sede,
  t.school_id,
  COUNT(*) as total_ventas,
  SUM(ABS(t.amount)) as monto_total,
  COUNT(CASE WHEN t.payment_status = 'pending' THEN 1 END) as pendientes,
  COUNT(CASE WHEN t.payment_status = 'paid' THEN 1 END) as pagadas,
  COUNT(CASE WHEN t.payment_status = 'cancelled' THEN 1 END) as anuladas,
  MIN(t.ticket_code) as primer_ticket,
  MAX(t.ticket_code) as ultimo_ticket
FROM transactions t
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
GROUP BY DATE(t.created_at AT TIME ZONE 'America/Lima'), s.name, t.school_id
ORDER BY fecha DESC, sede;

-- ============================================
-- PASO 4: ⚠️ VENTAS CON school_id = NULL (PROBLEMA CONOCIDO)
-- Estas ventas NO aparecen cuando el admin filtra por su sede
-- ============================================
SELECT 
  DATE(t.created_at AT TIME ZONE 'America/Lima') as fecha,
  t.ticket_code,
  t.description,
  t.amount,
  t.payment_status,
  t.student_id,
  t.teacher_id,
  t.manual_client_name,
  t.created_by,
  p.email as cajero_email,
  p.full_name as cajero_nombre,
  p.school_id as cajero_school_id,
  cs.name as sede_del_cajero
FROM transactions t
LEFT JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools cs ON p.school_id = cs.id
WHERE t.type = 'purchase'
  AND t.school_id IS NULL
  AND t.created_at >= '2026-02-01T00:00:00Z'
ORDER BY t.created_at DESC;

-- ============================================
-- PASO 5: CORRELATIVOS DE TICKETS - VERIFICAR SECUENCIA
-- Formato T-XX-NNNNNN = POS normal
-- Formato HIST-YYYYMMDD-NNN = Backfill histórico
-- ============================================
SELECT 
  CASE 
    WHEN t.ticket_code LIKE 'T-%' THEN 'POS (Cajero)'
    WHEN t.ticket_code LIKE 'HIST-%' THEN 'Histórico (Backfill)'
    WHEN t.ticket_code LIKE 'TMP-%' THEN 'Temporal (Error)'
    ELSE 'Otro'
  END as tipo_ticket,
  COUNT(*) as cantidad,
  MIN(t.ticket_code) as primer_ticket,
  MAX(t.ticket_code) as ultimo_ticket,
  MIN(DATE(t.created_at AT TIME ZONE 'America/Lima')) as primera_fecha,
  MAX(DATE(t.created_at AT TIME ZONE 'America/Lima')) as ultima_fecha
FROM transactions t
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND t.payment_status != 'cancelled'
GROUP BY 
  CASE 
    WHEN t.ticket_code LIKE 'T-%' THEN 'POS (Cajero)'
    WHEN t.ticket_code LIKE 'HIST-%' THEN 'Histórico (Backfill)'
    WHEN t.ticket_code LIKE 'TMP-%' THEN 'Temporal (Error)'
    ELSE 'Otro'
  END
ORDER BY tipo_ticket;

-- ============================================
-- PASO 6: DETALLE DE CORRELATIVOS POR CAJERO
-- Ver secuencia de tickets de cada cajero
-- ============================================
SELECT 
  p.email as cajero,
  p.full_name as nombre_cajero,
  p.ticket_prefix as prefijo_ticket,
  s.name as sede,
  COUNT(*) as total_ventas,
  MIN(t.ticket_code) as primer_ticket,
  MAX(t.ticket_code) as ultimo_ticket,
  MIN(DATE(t.created_at AT TIME ZONE 'America/Lima')) as primera_venta,
  MAX(DATE(t.created_at AT TIME ZONE 'America/Lima')) as ultima_venta
FROM transactions t
JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools s ON t.school_id = s.id
WHERE t.type = 'purchase'
  AND t.created_at >= '2026-02-01T00:00:00Z'
  AND t.payment_status != 'cancelled'
GROUP BY p.email, p.full_name, p.ticket_prefix, s.name
ORDER BY s.name, p.email;

-- ============================================
-- PASO 7: 🔧 FIX - ASIGNAR school_id A TRANSACCIONES QUE LO TIENEN NULL
-- Usa el school_id del cajero que creó la transacción
-- ⚠️ EJECUTAR SOLO DESPUÉS DE REVISAR PASO 4
-- ============================================

-- Primero ver cuántas se arreglarían:
SELECT 
  COUNT(*) as transacciones_a_reparar,
  cs.name as sede_correcta
FROM transactions t
JOIN profiles p ON t.created_by = p.id
LEFT JOIN schools cs ON p.school_id = cs.id
WHERE t.type = 'purchase'
  AND t.school_id IS NULL
  AND p.school_id IS NOT NULL
GROUP BY cs.name;

-- ⚠️ DESCOMENTA PARA EJECUTAR EL FIX:
-- UPDATE transactions t
-- SET school_id = p.school_id
-- FROM profiles p
-- WHERE t.created_by = p.id
--   AND t.type = 'purchase'
--   AND t.school_id IS NULL
--   AND p.school_id IS NOT NULL;
