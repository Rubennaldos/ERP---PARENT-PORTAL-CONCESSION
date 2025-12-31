import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Hook que verifica si un padre ha completado el onboarding
 * Si no lo ha completado, lo redirige automáticamente a /onboarding
 */
export function useOnboardingCheck() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        // Verificar si el usuario es padre
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // ⚠️ IMPORTANTE: Solo verificar onboarding para PADRES confirmados
        // Si no hay perfil o el rol NO es 'parent', NO hacer nada
        if (!profile) {
          console.log('⏭️ Perfil no encontrado, esperando a que se cree...');
          setIsChecking(false);
          return;
        }

        // Si NO es padre (es staff/admin/cajero), salir sin verificar
        if (profile.role !== 'parent') {
          console.log('⏭️ Usuario no es padre, omitir onboarding');
          setNeedsOnboarding(false);
          setIsChecking(false);
          return;
        }

        // Solo si es PADRE, verificar onboarding
        // PASO 1: Verificar datos del padre
        const { data: parentProfile } = await supabase
          .from('parent_profiles')
          .select('full_name, dni, phone_1, address')
          .eq('user_id', user.id)
          .maybeSingle();

        // Si faltan datos básicos del padre, al onboarding
        if (!parentProfile || 
            !parentProfile.full_name || 
            !parentProfile.dni || 
            !parentProfile.phone_1 || 
            !parentProfile.address) {
          console.log('🔄 Datos de padre incompletos, al onboarding');
          setNeedsOnboarding(true);
          setIsChecking(false);
          navigate('/onboarding', { replace: true });
          return;
        }

        // PASO 2: Verificar si tiene hijos registrados
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('parent_id', user.id)
          .limit(1);

        // Si NO tiene hijos registrados, al onboarding
        if (!students || students.length === 0) {
          console.log('🔄 Padre sin hijos, al onboarding');
          setNeedsOnboarding(true);
          setIsChecking(false);
          navigate('/onboarding', { replace: true });
          return;
        }

        // Si llegó aquí, todo está bien
        setNeedsOnboarding(false);
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setIsChecking(false);
      }
    }

    checkOnboarding();
  }, [user, navigate]);

  return { isChecking, needsOnboarding };
}
