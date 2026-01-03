import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface UserPermission {
  permission_id: string;
  granted: boolean;
  permission: Permission;
}

interface RolePermission {
  permission_id: string;
  permission: Permission;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [user]);

  const fetchPermissions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Obtener el rol del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      setUserRole(profile.role);

      // SuperAdmin tiene todos los permisos
      if (profile.role === 'superadmin') {
        const { data: allPermissions } = await supabase
          .from('permissions')
          .select('name');
        
        if (allPermissions) {
          setPermissions(new Set(allPermissions.map(p => p.name)));
        }
        setLoading(false);
        return;
      }

      // 2. Obtener permisos del rol
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permission:permissions (
            id,
            name,
            description,
            module
          )
        `)
        .eq('role', profile.role) as { data: RolePermission[] | null };

      const rolePerms = new Set<string>();
      if (rolePermissions) {
        rolePermissions.forEach(rp => {
          if (rp.permission) {
            rolePerms.add(rp.permission.name);
          }
        });
      }

      // 3. Obtener permisos individuales (pueden otorgar o revocar)
      const { data: userPermissions } = await supabase
        .from('user_permissions')
        .select(`
          permission_id,
          granted,
          permission:permissions (
            id,
            name,
            description,
            module
          )
        `)
        .eq('user_id', user.id) as { data: UserPermission[] | null };

      // 4. Combinar permisos: rol base + individuales
      const finalPermissions = new Set(rolePerms);

      if (userPermissions) {
        userPermissions.forEach(up => {
          if (up.permission) {
            if (up.granted) {
              // Otorgar permiso adicional
              finalPermissions.add(up.permission.name);
            } else {
              // Revocar permiso
              finalPermissions.delete(up.permission.name);
            }
          }
        });
      }

      setPermissions(finalPermissions);
    } catch (error) {
      console.error('❌ Error al cargar permisos:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param permission Nombre del permiso (ej: "ventas.anular")
   * @returns true si tiene el permiso, false si no
   */
  const can = (permission: string): boolean => {
    return permissions.has(permission);
  };

  /**
   * Verifica si el usuario NO tiene un permiso específico
   * @param permission Nombre del permiso
   * @returns true si NO tiene el permiso
   */
  const cannot = (permission: string): boolean => {
    return !permissions.has(permission);
  };

  /**
   * Verifica si el usuario tiene ALGUNO de los permisos
   * @param permissionList Lista de permisos
   * @returns true si tiene al menos uno
   */
  const canAny = (permissionList: string[]): boolean => {
    return permissionList.some(p => permissions.has(p));
  };

  /**
   * Verifica si el usuario tiene TODOS los permisos
   * @param permissionList Lista de permisos
   * @returns true si tiene todos
   */
  const canAll = (permissionList: string[]): boolean => {
    return permissionList.every(p => permissions.has(p));
  };

  /**
   * Obtiene todos los permisos del usuario
   * @returns Array de nombres de permisos
   */
  const getPermissions = (): string[] => {
    return Array.from(permissions);
  };

  return {
    can,
    cannot,
    canAny,
    canAll,
    getPermissions,
    permissions,
    loading,
    userRole,
    refetch: fetchPermissions,
  };
}

