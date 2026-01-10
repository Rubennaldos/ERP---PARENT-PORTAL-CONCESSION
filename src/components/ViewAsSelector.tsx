import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/hooks/useRole';
import { useViewAsStore } from '@/stores/viewAsStore';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertTriangle, PlayCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface School {
  id: string;
  name: string;
  code: string;
}

const ROLES_OPTIONS = [
  { value: 'supervisor_red', label: 'Supervisor de Red', icon: '🌐', needsSchool: false },
  { value: 'gestor_unidad', label: 'Gestor de Unidad', icon: '🏢', needsSchool: true },
  { value: 'operador_caja', label: 'Operador de Caja', icon: '💰', needsSchool: true },
  { value: 'operador_cocina', label: 'Operador de Cocina', icon: '👨‍🍳', needsSchool: true },
];

export const ViewAsSelector = () => {
  const { role } = useRole();
  const { 
    isViewAsMode, 
    viewAsRole, 
    viewAsSchoolName, 
    enableViewAs, 
    disableViewAs
  } = useViewAsStore();
  
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  // Solo mostrar para Admin General o Superadmin
  if (role !== 'admin_general' && role !== 'superadmin') {
    return null;
  }

  const handleActivateViewAs = () => {
    const roleOption = ROLES_OPTIONS.find(r => r.value === selectedRole);
    if (!roleOption) return;

    const school = schools.find(s => s.id === selectedSchoolId);
    
    if (roleOption.needsSchool && !school) {
      alert('Por favor selecciona una sede para este rol.');
      return;
    }

    enableViewAs(
      selectedRole, 
      roleOption.needsSchool ? selectedSchoolId : null,
      school?.name || null
    );

    // Recargar página para aplicar el filtro
    window.location.reload();
  };

  const handleDeactivateViewAs = () => {
    disableViewAs();
    // Recargar página para volver a la vista normal
    window.location.reload();
  };

  const selectedRoleOption = ROLES_OPTIONS.find(r => r.value === selectedRole);

  return (
    <div className="space-y-4">
      {isViewAsMode ? (
        // Modo Activo: Mostrar alerta y botón para salir
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-yellow-900">🔒 MODO SOLO LECTURA ACTIVO</span>
              <p className="text-sm text-yellow-800 mt-1">
                Estás viendo como: <Badge variant="secondary">{ROLES_OPTIONS.find(r => r.value === viewAsRole)?.label}</Badge>
                {viewAsSchoolName && <Badge variant="outline" className="ml-2">{viewAsSchoolName}</Badge>}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Puedes navegar y ver todo, pero tus acciones NO se guardarán.
              </p>
            </div>
            <Button 
              onClick={handleDeactivateViewAs} 
              variant="destructive" 
              size="sm"
              className="ml-4"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Salir del Modo Vista
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        // Modo Inactivo: Mostrar selector
        <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <Eye className="h-5 w-5 text-purple-600" />
          <div className="flex-1 flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-purple-900">👁️ Ver como:</p>
              <p className="text-xs text-purple-700">Simula la vista de otro rol (solo lectura)</p>
            </div>
            
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {ROLES_OPTIONS.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    <span className="flex items-center gap-2">
                      <span>{role.icon}</span>
                      <span>{role.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRoleOption?.needsSchool && (
              <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona sede" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button 
              onClick={handleActivateViewAs}
              disabled={!selectedRole || (selectedRoleOption?.needsSchool && !selectedSchoolId)}
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Activar Vista
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

