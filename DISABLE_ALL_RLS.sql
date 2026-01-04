-- =====================================================
-- SOLUCIÓN ULTRA SIMPLE: DESHABILITAR TODO RLS
-- =====================================================
-- Este script elimina TODA restricción RLS temporalmente
-- para que puedas entrar y configurar después

-- PASO 1: Deshabilitar RLS en TODAS las tablas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;

-- PASO 2: Limpiar TODAS las políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || 
                ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- VERIFICACIÓN
SELECT 'TODAS las políticas RLS eliminadas - Sistema abierto' AS status;

-- NOTA: Ahora CUALQUIER usuario autenticado puede hacer TODO
-- Esto es temporal mientras configuras el sistema
-- Después podrás volver a habilitar RLS cuando esté todo funcionando

