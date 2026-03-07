-- =====================================================
-- FIX: Permitir a padres insertar transacciones de almuerzo
-- Error: "new row violates row-level security policy for table transactions"
-- =====================================================

-- Política para que los padres puedan INSERTAR transacciones
-- (necesario para registrar cargos de almuerzo desde el portal de padres)
DROP POLICY IF EXISTS "parents_insert_transactions" ON public.transactions;
CREATE POLICY "parents_insert_transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- Política para que los padres puedan VER sus propias transacciones
DROP POLICY IF EXISTS "parents_view_own_transactions" ON public.transactions;
CREATE POLICY "parents_view_own_transactions" ON public.transactions
  FOR SELECT USING (
    created_by = auth.uid()
    OR student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

-- También necesitamos que puedan leer lunch_configuration
DROP POLICY IF EXISTS "anyone_read_lunch_configuration" ON public.lunch_configuration;
CREATE POLICY "anyone_read_lunch_configuration" ON public.lunch_configuration
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
