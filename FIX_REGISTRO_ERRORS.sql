-- ⚡ ARREGLAR ERRORES DEL SISTEMA DE REGISTRO
-- Ejecuta TODO esto en Supabase

-- 1. ARREGLAR CONSTRAINT DE student_relationships
ALTER TABLE public.student_relationships 
  DROP CONSTRAINT IF EXISTS student_relationships_parent_id_fkey;

ALTER TABLE public.student_relationships 
  ADD CONSTRAINT student_relationships_parent_id_fkey 
  FOREIGN KEY (parent_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. AGREGAR POLÍTICAS PARA QUE LOS PADRES PUEDAN INSERTAR ESTUDIANTES
DROP POLICY IF EXISTS "padres_crean_sus_hijos" ON public.students;

CREATE POLICY "padres_crean_sus_hijos"
  ON public.students FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- 3. ASEGURAR QUE LA COLUMNA "name" EXISTA Y ESTÉ SINCRONIZADA
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS name VARCHAR(200);

-- Sincronizar name con full_name si está vacío
UPDATE public.students SET name = full_name WHERE name IS NULL OR name = '';

-- 4. POLÍTICA PARA QUE LOS PADRES PUEDAN LEER ESCUELAS
DROP POLICY IF EXISTS "Todos pueden ver colegios" ON public.schools;

CREATE POLICY "Todos pueden ver colegios"
  ON public.schools FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- 5. HABILITAR QUE LOS PADRES LEAN SU PERFIL AL REGISTRARSE
DROP POLICY IF EXISTS "Padres ven su propio perfil" ON public.parent_profiles;

CREATE POLICY "Padres ven su propio perfil"
  ON public.parent_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 6. VERIFICAR QUE TODO ESTÉ BIEN
SELECT 
  '✅ Escuelas disponibles:' as check_item,
  COUNT(*) as total
FROM public.schools WHERE is_active = true;

SELECT 
  '✅ Políticas en students:' as check_item,
  COUNT(*) as total
FROM pg_policies 
WHERE tablename = 'students';

SELECT 
  '✅ Constraint corregido:' as check_item,
  conname as constraint_name
FROM pg_constraint 
WHERE conname = 'student_relationships_parent_id_fkey';

