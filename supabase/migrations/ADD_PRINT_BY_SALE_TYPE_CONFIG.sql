-- =====================================================
-- ACTUALIZACIÓN: Configuración de impresión por tipo de venta
-- =====================================================

-- Agregar campos para controlar qué se imprime según tipo de venta
ALTER TABLE public.printer_configs
ADD COLUMN IF NOT EXISTS print_ticket_general BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_comanda_general BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_ticket_credit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS print_comanda_credit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_ticket_teacher BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS print_comanda_teacher BOOLEAN DEFAULT true;

-- Comentarios
COMMENT ON COLUMN public.printer_configs.print_ticket_general IS 
  'Imprimir ticket para ventas generales (efectivo/tarjeta)';

COMMENT ON COLUMN public.printer_configs.print_comanda_general IS 
  'Imprimir comanda para ventas generales';

COMMENT ON COLUMN public.printer_configs.print_ticket_credit IS 
  'Imprimir ticket para ventas a crédito (estudiantes)';

COMMENT ON COLUMN public.printer_configs.print_comanda_credit IS 
  'Imprimir comanda para ventas a crédito';

COMMENT ON COLUMN public.printer_configs.print_ticket_teacher IS 
  'Imprimir ticket para ventas a profesores/personal';

COMMENT ON COLUMN public.printer_configs.print_comanda_teacher IS 
  'Imprimir comanda para ventas a profesores';

-- Actualizar configuraciones existentes con valores por defecto
UPDATE public.printer_configs
SET 
  print_ticket_general = true,   -- General: TICKET + COMANDA
  print_comanda_general = true,
  print_ticket_credit = false,   -- Crédito: SOLO COMANDA
  print_comanda_credit = true,
  print_ticket_teacher = false,  -- Profesor: SOLO COMANDA
  print_comanda_teacher = true
WHERE print_ticket_general IS NULL;

-- Verificar
SELECT 
  pc.id,
  s.name AS sede,
  pc.print_ticket_general AS "General Ticket",
  pc.print_comanda_general AS "General Comanda",
  pc.print_ticket_credit AS "Crédito Ticket",
  pc.print_comanda_credit AS "Crédito Comanda",
  pc.print_ticket_teacher AS "Profesor Ticket",
  pc.print_comanda_teacher AS "Profesor Comanda"
FROM public.printer_configs pc
INNER JOIN public.schools s ON pc.school_id = s.id
ORDER BY s.name;
