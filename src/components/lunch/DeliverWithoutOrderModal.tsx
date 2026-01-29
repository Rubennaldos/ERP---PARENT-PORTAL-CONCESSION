import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, AlertCircle, Search } from 'lucide-react';

interface DeliverWithoutOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSuccess: () => void;
}

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  free_account: boolean;
  school_id: string;
}

export function DeliverWithoutOrderModal({ isOpen, onClose, selectedDate, onSuccess }: DeliverWithoutOrderModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [lunchPrice, setLunchPrice] = useState<number>(5.50); // Precio por defecto

  useEffect(() => {
    if (isOpen) {
      fetchLunchPrice();
      setSelectedStudent(null);
      setSearchTerm('');
      setStudents([]);
    }
  }, [isOpen]);

  const fetchLunchPrice = async () => {
    try {
      // Obtener el precio del almuerzo de la configuración
      const { data, error } = await supabase
        .from('lunch_configuration')
        .select('lunch_price')
        .limit(1)
        .maybeSingle();

      if (data && data.lunch_price) {
        setLunchPrice(data.lunch_price);
      }
    } catch (error: any) {
      console.error('Error obteniendo precio:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo requerido',
        description: 'Ingresa un nombre para buscar.',
      });
      return;
    }

    try {
      setSearching(true);
      console.log('🔍 Buscando estudiantes con cuenta crédito:', searchTerm);

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, photo_url, free_account, school_id')
        .eq('free_account', true) // Solo estudiantes con cuenta crédito
        .eq('is_active', true)
        .ilike('full_name', `%${searchTerm.trim()}%`)
        .limit(10);

      if (error) throw error;

      setStudents(data || []);

      if (!data || data.length === 0) {
        toast({
          title: 'Sin resultados',
          description: 'No se encontraron estudiantes con cuenta crédito que coincidan con la búsqueda.',
        });
      }
    } catch (error: any) {
      console.error('❌ Error buscando estudiantes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron buscar estudiantes.',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleDeliver = async () => {
    if (!selectedStudent) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un estudiante',
        description: 'Debes seleccionar un estudiante antes de continuar.',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('📦 Entregando almuerzo sin pedido previo...');

      // Llamar a la función RPC para crear el registro y la deuda
      const { data, error } = await supabase.rpc('create_lunch_delivery_no_order', {
        p_student_id: selectedStudent.id,
        p_order_date: selectedDate,
        p_delivered_by: user?.id,
        p_lunch_price: lunchPrice
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Error al registrar la entrega');
      }

      toast({
        title: '✅ Almuerzo entregado',
        description: `Se registró la entrega y se creó una deuda de S/ ${lunchPrice.toFixed(2)} para ${selectedStudent.full_name}.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('❌ Error entregando almuerzo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo registrar la entrega.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-orange-600" />
            Entregar Sin Pedido Previo
          </DialogTitle>
          <DialogDescription>
            Registra la entrega de un almuerzo que no fue pedido con anticipación. 
            Se creará una deuda automática en la cuenta del estudiante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div>
            <Label htmlFor="search">Buscar Estudiante</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Nombre del estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={searching || loading}
              />
              <Button
                onClick={handleSearch}
                disabled={searching || loading}
                className="gap-2"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </Button>
            </div>
          </div>

          {/* Resultados */}
          {students.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedStudent?.id === student.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">
                        {student.full_name[0]}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-sm text-gray-500">Cuenta crédito activa</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Estudiante seleccionado */}
          {selectedStudent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-900 mb-1">
                Estudiante seleccionado:
              </p>
              <p className="text-lg font-bold text-green-700">
                {selectedStudent.full_name}
              </p>
              <p className="text-sm text-green-600 mt-2">
                Precio del almuerzo: <span className="font-bold">S/ {lunchPrice.toFixed(2)}</span>
              </p>
            </div>
          )}

          {/* Advertencia */}
          <div className="bg-orange-50 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">¿Cuándo usar esta opción?</p>
              <p>
                Solo para estudiantes con <strong>cuenta crédito</strong> cuyos padres se olvidaron de hacer el pedido. 
                El almuerzo se entrega de inmediato y se crea una deuda automática que el padre verá en su portal.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeliver}
              disabled={loading || !selectedStudent}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Entregar y Crear Deuda
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
