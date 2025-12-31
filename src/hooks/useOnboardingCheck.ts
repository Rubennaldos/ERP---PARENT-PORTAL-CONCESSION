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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Si no es padre, no necesita onboarding
        if (profile.role !== 'parent') {
          setNeedsOnboarding(false);
          setIsChecking(false);
          return;
        }

        // PASO 1: Verificar si tiene parent_profile con datos completos
        const { data: parentProfile, error: parentError } = await supabase
          .from('parent_profiles')
          .select('full_name, dni, phone_1, address')
          .eq('user_id', user.id)
          .single();

        // Si no tiene parent_profile o le faltan datos, redirigir a onboarding
        if (parentError || !parentProfile || 
            !parentProfile.full_name || 
            !parentProfile.dni || 
            !parentProfile.phone_1 || 
            !parentProfile.address) {
          console.log('🔄 Padre sin datos completos, redirigiendo a onboarding...');
          setNeedsOnboarding(true);
          setIsChecking(false);
          navigate('/onboarding', { replace: true });
          return;
        }

        // PASO 2: Verificar si tiene hijos registrados
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('parent_id', user.id)
          .limit(1);

        if (studentsError) {
          console.error('Error checking students:', studentsError);
          throw studentsError;
        }

        // Si NO tiene hijos, redirigir a onboarding
        if (!students || students.length === 0) {
          console.log('🔄 Padre sin hijos, redirigiendo a onboarding...');
          setNeedsOnboarding(true);
          setIsChecking(false);
          navigate('/onboarding', { replace: true });
          return;
        }

        console.log('✅ Padre con datos completos y con hijos, puede acceder al dashboard');

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

