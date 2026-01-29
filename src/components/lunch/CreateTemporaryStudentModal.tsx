import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';

interface CreateTemporaryStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface School {
  id: string;
  name: string;
  code: string;
}

export function CreateTemporaryStudentModal({ isOpen, onClose, onSuccess }: CreateTemporaryStudentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  
  const [fullName, setFullName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSchools();
      resetForm();
    }
  }, [isOpen]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      setSchools(data || []);

      // Auto-seleccionar la primera sede si solo hay una
      if (data && data.length === 1) {
        setSelectedSchool(data[0].id);
      }
    } catch (error: any) {
      console.error('Error cargando escuelas:', error);
    }
  };

  const resetForm = () => {
    setFullName('');
    setClassroomName('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo requerido',
        description: 'Ingresa el nombre completo del estudiante.',
      });
      return;
    }

    if (!classroomName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo requerido',
        description: 'Ingresa el salón o grado.',
      });
      return;
    }

    if (!selectedSchool) {
      toast({
        variant: 'destructive',
        title: 'Campo requerido',
        description: 'Selecciona una sede.',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Creando estudiante temporal (puente)...');

      // Llamar a la función RPC para crear el estudiante temporal
      const { data, error } = await supabase.rpc('create_temporary_student', {
        p_full_name: fullName.trim(),
        p_classroom_name: classroomName.trim(),
        p_school_id: selectedSchool,
        p_notes: notes.trim() || null
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Error al crear estudiante temporal');
      }

      toast({
        title: '✅ Puente temporal creado',
        description: `${fullName} ha sido registrado exitosamente.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('❌ Error creando estudiante temporal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo crear el estudiante temporal.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-600" />
            Crear Puente Temporal
          </DialogTitle>
          <DialogDescription>
            Registra un estudiante temporal sin cuenta ni padre asociado. Útil para niños que necesitan almuerzo pero aún no están en el sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div>
            <Label htmlFor="fullName">
              Nombre Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Ej: Juan Pérez García"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Salón/Grado */}
          <div>
            <Label htmlFor="classroom">
              Salón o Grado <span className="text-red-500">*</span>
            </Label>
            <Input
              id="classroom"
              placeholder="Ej: 3ro A, 2do B, etc."
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Sede */}
          <div>
            <Label htmlFor="school">
              Sede <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedSchool} onValueChange={setSelectedSchool} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Padre viene mañana a pagar, llamar al 999-888-777"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">¿Qué es un puente temporal?</p>
              <p>
                Es un estudiante sin padre asociado que puede usar el servicio de almuerzos. 
                Los almuerzos se cargarán a una cuenta temporal que deberá ser pagada después.
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
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Puente Temporal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
