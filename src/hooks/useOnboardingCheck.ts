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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        console.log('🔍 [OnboardingCheck] Intento:', retryCount + 1);
        
        // Verificar si el usuario es padre
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // ⚠️ Si no hay perfil, reintentar hasta 3 veces (puede tardar con triggers)
        if (!profile) {
          console.log('⏸️ [OnboardingCheck] Perfil no encontrado...');
          if (retryCount < 3) {
            console.log(`⏳ [OnboardingCheck] Reintentando en 1.5 segundos... (intento ${retryCount + 1}/3)`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1500);
            return;
          } else {
            console.log('❌ [OnboardingCheck] Perfil no encontrado después de 3 intentos');
            setIsChecking(false);
            return;
          }
        }

        console.log('✅ [OnboardingCheck] Rol detectado:', profile.role);

        // Si NO es padre (es staff/admin/cajero/gestor), salir sin verificar
        if (profile.role !== 'parent') {
          console.log('✅ [OnboardingCheck] Usuario NO es padre, no requiere onboarding');
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
  }, [user, navigate, retryCount]);

  return { isChecking, needsOnboarding };
}
