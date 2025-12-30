-- ============================================
-- ARREGLAR ERRORES DEL SISTEMA DE REGISTRO
-- ============================================

-- 1️⃣ Asegurar que students tenga school_id
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- 2️⃣ RLS: Permitir a los padres insertar en parent_profiles
DROP POLICY IF EXISTS "Parents can insert their own profile" ON public.parent_profiles;
CREATE POLICY "Parents can insert their own profile"
  ON public.parent_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3️⃣ RLS: Permitir a los padres actualizar su propio perfil (para marcar onboarding_completed)
DROP POLICY IF EXISTS "Parents can update their own profile" ON public.parent_profiles;
CREATE POLICY "Parents can update their own profile"
  ON public.parent_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- 4️⃣ RLS: Permitir a los padres ver su propio perfil
DROP POLICY IF EXISTS "Parents can view their own profile" ON public.parent_profiles;
CREATE POLICY "Parents can view their own profile"
  ON public.parent_profiles FOR SELECT
  USING (user_id = auth.uid());

-- 5️⃣ RLS: Permitir a los padres insertar estudiantes
DROP POLICY IF EXISTS "Parents can insert their own students" ON public.students;
CREATE POLICY "Parents can insert their own students"
  ON public.students FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- 6️⃣ RLS: Permitir insertar en student_relationships
DROP POLICY IF EXISTS "Parents can create relationships" ON public.student_relationships;
CREATE POLICY "Parents can create relationships"
  ON public.student_relationships FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- 7️⃣ RLS: Permitir insertar en allergies
DROP POLICY IF EXISTS "Users can insert allergies" ON public.allergies;
CREATE POLICY "Users can insert allergies"
  ON public.allergies FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 8️⃣ RLS: Permitir insertar en terms_and_conditions
DROP POLICY IF EXISTS "Users can accept terms" ON public.terms_and_conditions;
CREATE POLICY "Users can accept terms"
  ON public.terms_and_conditions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 9️⃣ RLS: Permitir a cualquiera leer schools (para el selector)
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
CREATE POLICY "Anyone can view schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (true);

-- 🔟 Verificar que existan colegios de ejemplo
INSERT INTO public.schools (name, code, is_active) VALUES
  ('Colegio A', 'colegio-a', true),
  ('Colegio B', 'colegio-b', true),
  ('Colegio C', 'colegio-c', true)
ON CONFLICT (code) DO NOTHING;

-- ✅ VERIFICACIÓN
SELECT 
  'parent_profiles' as tabla,
  COUNT(*) as políticas
FROM pg_policies 
WHERE tablename = 'parent_profiles'

UNION ALL

SELECT 
  'students' as tabla,
  COUNT(*) as políticas
FROM pg_policies 
WHERE tablename = 'students';

-- Ver estructura de students
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students' 
  AND table_schema = 'public'
  AND column_name IN ('parent_id', 'school_id', 'full_name', 'name')
ORDER BY column_name;
