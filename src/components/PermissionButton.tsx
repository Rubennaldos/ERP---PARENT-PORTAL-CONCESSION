import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionButtonProps extends ButtonProps {
  permission: string;
  children: React.ReactNode;
  showLockIcon?: boolean;
  fallbackMessage?: string;
}

/**
 * Botón que se deshabilita automáticamente si el usuario no tiene el permiso
 * Si no tiene permiso, muestra un candado y un tooltip explicativo
 */
export function PermissionButton({
  permission,
  children,
  showLockIcon = true,
  fallbackMessage = 'No tienes permiso para realizar esta acción',
  onClick,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { can, loading } = usePermissions();

  const hasPermission = can(permission);
  const isDisabled = disabled || !hasPermission || loading;

  // Si está cargando, mostrar estado de carga
  if (loading) {
    return (
      <Button disabled {...props}>
        {children}
      </Button>
    );
  }

  // Si NO tiene permiso, mostrar botón deshabilitado con candado
  if (!hasPermission) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled
              variant="outline"
              className="opacity-50 cursor-not-allowed"
              {...props}
            >
              {showLockIcon && <Lock className="h-4 w-4 mr-2" />}
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{fallbackMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Permiso requerido: <code className="text-xs">{permission}</code>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Si tiene permiso, mostrar botón normal
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}

