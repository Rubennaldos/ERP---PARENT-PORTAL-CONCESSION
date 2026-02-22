import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal = ({ open, onOpenChange }: ChangePasswordModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        variant: 'destructive',
        title: '⚠️ Campos Incompletos',
        description: 'Por favor completa todos los campos',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: '⚠️ Contraseña muy corta',
        description: 'La nueva contraseña debe tener al menos 6 caracteres',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: '⚠️ Las contraseñas no coinciden',
        description: 'La nueva contraseña y la confirmación deben ser iguales',
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        variant: 'destructive',
        title: '⚠️ Contraseña Igual',
        description: 'La nueva contraseña debe ser diferente a la actual',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Intentando cambiar contraseña...');

      // Paso 1: Verificar contraseña actual usando signInWithPassword
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) {
        throw new Error('No se pudo obtener el email del usuario');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.user.email,
        password: currentPassword,
      });

      if (signInError) {
        console.error('❌ Contraseña actual incorrecta:', signInError);
        toast({
          variant: 'destructive',
          title: '❌ Contraseña Incorrecta',
          description: 'La contraseña actual no es correcta',
        });
        setLoading(false);
        return;
      }

      console.log('✅ Contraseña actual verificada');

      // Paso 2: Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('❌ Error al actualizar contraseña:', updateError);
        throw updateError;
      }

      console.log('✅ Contraseña actualizada exitosamente');

      toast({
        title: '✅ Contraseña Actualizada',
        description: 'Tu contraseña ha sido cambiada exitosamente',
      });

      // Limpiar formulario y cerrar modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);

    } catch (error: any) {
      console.error('❌ Error al cambiar contraseña:', error);
      toast({
        variant: 'destructive',
        title: '❌ Error',
        description: error.message || 'No se pudo cambiar la contraseña',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#9E4D68]" />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>
            Ingresa tu contraseña actual y elige una nueva contraseña
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contraseña Actual */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Tu contraseña actual"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && newPassword.length < 6 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                La contraseña debe tener al menos 6 caracteres
              </p>
            )}
            {newPassword && newPassword.length >= 6 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Contraseña válida
              </p>
            )}
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Las contraseñas no coinciden
              </p>
            )}
            {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Las contraseñas coinciden
              </p>
            )}
          </div>

          {/* Información de Seguridad */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <strong>Recomendaciones de Seguridad:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Usa una contraseña fuerte y única</li>
                  <li>Combina letras, números y símbolos</li>
                  <li>No compartas tu contraseña con nadie</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
            className="flex-1 bg-[#9E4D68] hover:bg-[#B86880]"
          >
            {loading ? (
              <>
                <Lock className="mr-2 h-4 w-4 animate-spin" />
                Cambiando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Cambiar Contraseña
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
