-- ============================================================
-- FIX: Deshabilitar confirmación de email en Supabase
-- Para que el padre entre DIRECTO al sistema al registrarse
-- ============================================================

-- ✅ OPCIÓN 1: SQL directo (ejecutar en Supabase > SQL Editor)
-- Confirmar manualmente todos los usuarios pendientes de confirmación
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- ✅ OPCIÓN 2: Para nuevos registros futuros (confirmar automáticamente)
-- Esto aplica a usuarios ya existentes que quedaron sin confirmar
UPDATE auth.users
SET email_confirmed_at = created_at
WHERE email_confirmed_at IS NULL
  AND created_at IS NOT NULL;

-- ============================================================
-- ⚙️  CONFIGURACIÓN OBLIGATORIA EN EL DASHBOARD DE SUPABASE
-- ============================================================
-- 
-- 1. Ve a: https://supabase.com/dashboard
-- 2. Entra a tu proyecto
-- 3. Click en "Authentication" (menú lateral)
-- 4. Click en "Providers"
-- 5. Busca "Email" y click para expandir
-- 6. DESACTIVA la opción: "Enable email confirmations"  ← 🔴 ESTO ES LO CLAVE
-- 7. Guarda los cambios
--
-- Con eso desactivado, cuando el padre se registre:
-- → Supabase crea la cuenta y devuelve una sesión activa
-- → El padre entra DIRECTO al onboarding del portal
-- → Sin ningún email de confirmación de por medio
-- ============================================================

-- Verificar usuarios sin confirmar (para diagnóstico)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ SIN CONFIRMAR'
    ELSE '✅ CONFIRMADO'
  END as estado
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;
