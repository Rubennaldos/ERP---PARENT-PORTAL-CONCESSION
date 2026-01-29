import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Settings, User, Key, HelpCircle } from 'lucide-react';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import { EditTeacherProfileModal } from './EditTeacherProfileModal';

interface TeacherMoreMenuProps {
  teacherProfile: any;
  onProfileUpdate: () => void;
}

export function TeacherMoreMenu({ teacherProfile, onProfileUpdate }: TeacherMoreMenuProps) {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Configuración</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowEditProfile(true)}>
            <User className="mr-2 h-4 w-4" />
            Editar Datos Personales
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
            <Key className="mr-2 h-4 w-4" />
            Cambiar Contraseña
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            Ayuda
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Editar Perfil */}
      {showEditProfile && (
        <EditTeacherProfileModal
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          teacherProfile={teacherProfile}
          onSuccess={() => {
            setShowEditProfile(false);
            onProfileUpdate();
          }}
        />
      )}

      {/* Modal de Cambiar Contraseña */}
      {showChangePassword && (
        <ChangePasswordModal
          open={showChangePassword}
          onOpenChange={setShowChangePassword}
        />
      )}
    </>
  );
}
