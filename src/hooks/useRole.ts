import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type UserRole = 
  | 'parent' 
  | 'teacher'
  | 'superadmin' 
  | 'admin_general' 
  | 'supervisor_red' 
  | 'gestor_unidad' 
  | 'operador_caja' 
  | 'operador_cocina' 
  | null;

interface UseRoleReturn {
  role: UserRole;
  loading: boolean;
  error: Error | null;
  isParent: boolean;
  isStaff: boolean;
  canViewAllSchools: boolean;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  getDefaultRoute: () => string;
}

export function useRole(): UseRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 🔒 SUPERADMIN - Lista de emails con acceso total
        const superadminEmails = [
          'superadmin@maracuya.com',
          'superadmin@maracuyatiendas.com',
        ];
        
        // También chequear variable de entorno
        const envEmail = import.meta.env.VITE_SUPERADMIN_EMAIL;
        if (envEmail && !superadminEmails.includes(envEmail)) {
          superadminEmails.push(envEmail);
        }

        const userEmail = (user.email || '').toLowerCase().trim();
        console.log('🔍 useRole: Checking superadmin for:', userEmail, 'against:', superadminEmails);
        
        if (superadminEmails.some(e => e.toLowerCase().trim() === userEmail)) {
          console.log('🔐 SuperAdmin detectado:', userEmail);
          setRole('superadmin');
          setLoading(false);
          return;
        }

        console.log('🔍 useRole: Buscando rol para usuario:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ useRole: Error al buscar rol:', error);
          throw error;
        }
        
        // 🔥 Si el rol en profiles es 'parent' pero el user_metadata dice 'teacher',
        // usar el metadata como fuente de verdad (el trigger puede haber fallado)
        let resolvedRole = data?.role || 'parent';
        const metadataRole = user.user_metadata?.role;
        
        if (resolvedRole === 'parent' && metadataRole === 'teacher') {
          console.warn('⚠️ useRole: Rol en profiles es "parent" pero metadata dice "teacher". Usando "teacher".');
          resolvedRole = 'teacher';
          
          // Intentar corregir el perfil en background
          supabase.from('profiles').update({ role: 'teacher' }).eq('id', user.id)
            .then(({ error: fixErr }) => {
              if (fixErr) console.warn('⚠️ No se pudo auto-corregir rol:', fixErr.message);
              else console.log('✅ Rol auto-corregido a teacher en profiles');
            });
        }
        
        console.log('✅ useRole: Rol final:', resolvedRole);
        setRole(resolvedRole as UserRole);
      } catch (err) {
        console.error('Error al obtener rol:', err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
        // 🔥 Usar metadata como fallback en vez de siempre 'parent'
        const metadataRole = user.user_metadata?.role;
        const fallbackRole = (metadataRole === 'teacher' ? 'teacher' : 'parent') as UserRole;
        console.warn('⚠️ useRole: Usando fallback del metadata:', fallbackRole);
        setRole(fallbackRole);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const isParent = useMemo(() => role === 'parent', [role]);
  const isStaff = useMemo(
    () => [
      'superadmin', 
      'admin_general', 
      'supervisor_red', 
      'gestor_unidad', 
      'operador_caja', 
      'operador_cocina'
    ].includes(role || ''),
    [role]
  );

  // ✅ Roles que pueden ver TODAS las sedes
  const canViewAllSchools = useMemo(
    () => ['superadmin', 'admin_general', 'supervisor_red'].includes(role || ''),
    [role]
  );

  const hasRole = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!role) return false;
      return allowedRoles.includes(role);
    },
    [role]
  );

  const getDefaultRoute = useCallback((): string => {
    switch (role) {
      case 'parent':
        return '/';
      case 'teacher':
        return '/teacher'; // Portal del profesor
      case 'superadmin':
        return '/superadmin'; // Panel técnico del programador
      case 'admin_general':
        return '/dashboard'; // Dashboard de módulos de negocio
      case 'supervisor_red':
        return '/dashboard'; // Auditor multi-sede
      case 'gestor_unidad':
        return '/dashboard'; // Administrador de sede
      case 'operador_caja':
        return '/pos'; // Cajero directo al POS
      case 'operador_cocina':
        return '/comedor'; // Cocina directo a su pantalla
      default:
        return '/';
    }
  }, [role]);

  return {
    role,
    loading,
    error,
    isParent,
    isStaff,
    canViewAllSchools,
    hasRole,
    getDefaultRoute,
  };
}

