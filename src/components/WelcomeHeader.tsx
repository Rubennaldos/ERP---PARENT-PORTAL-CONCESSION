import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Badge } from './ui/badge';

interface WelcomeHeaderProps {
  showRole?: boolean;
}

export const WelcomeHeader = ({ showRole = true }: WelcomeHeaderProps) => {
  const { user } = useAuth();
  const { role } = useRole();

  const getRoleLabel = () => {
    switch (role) {
      case 'superadmin':
        return 'Programador';
      case 'admin_general':
        return 'Administrador General';
      case 'supervisor_red':
        return 'Supervisor de Red';
      case 'gestor_unidad':
        return 'Gestor de Unidad';
      case 'operador_caja':
        return 'Operador de Caja';
      case 'operador_cocina':
        return 'Operador de Cocina';
      case 'parent':
        return 'Padre de Familia';
      default:
        return 'Usuario';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  // Extraer el primer nombre del email si no hay full_name
  const getName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuario';
  };

  return (
    <div className="flex items-center gap-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {getGreeting()}, {getName()}! 👋
        </h2>
        {showRole && (
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {getRoleLabel()}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

