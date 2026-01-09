/**
 * Hook para capturar y registrar errores en la base de datos
 * Uso: const { logError } = useErrorLogger();
 */

import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';

interface ErrorLogData {
  errorType?: 'auth' | 'database' | 'validation' | 'network' | 'permission' | 'unknown';
  errorMessage: string;
  errorTranslated?: string;
  pageUrl?: string;
  component?: string;
  action?: string;
  errorStack?: string;
}

export function useErrorLogger() {
  const { user } = useAuth();
  const { role } = useRole();

  const logError = async (data: ErrorLogData) => {
    try {
      // Detectar el tipo de error automáticamente si no se proporciona
      let errorType = data.errorType || 'unknown';
      
      if (!data.errorType) {
        const msg = data.errorMessage.toLowerCase();
        if (msg.includes('auth') || msg.includes('token') || msg.includes('session')) {
          errorType = 'auth';
        } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
          errorType = 'network';
        } else if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls')) {
          errorType = 'permission';
        } else if (msg.includes('database') || msg.includes('postgres') || msg.includes('supabase')) {
          errorType = 'database';
        } else if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
          errorType = 'validation';
        }
      }

      // Traducir mensaje de error a español (simplificado)
      let errorTranslated = data.errorTranslated || translateError(data.errorMessage);

      // Obtener información del contexto
      const pageUrl = data.pageUrl || window.location.pathname;
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
      };

      // Insertar en la BD
      const { error: insertError } = await supabase
        .from('error_logs')
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || 'Anónimo',
          user_role: role || 'unknown',
          error_type: errorType,
          error_message: data.errorMessage,
          error_translated: errorTranslated,
          error_stack: data.errorStack || null,
          page_url: pageUrl,
          component: data.component || null,
          action: data.action || null,
          browser_info: browserInfo,
        });

      if (insertError) {
        console.error('❌ Error al registrar error en BD:', insertError);
      } else {
        console.log('📝 Error registrado en BD:', {
          type: errorType,
          message: errorTranslated,
          page: pageUrl,
        });
      }
    } catch (e) {
      // Evitar un loop infinito si el logging falla
      console.error('❌ Error crítico en useErrorLogger:', e);
    }
  };

  return { logError };
}

/**
 * Traduce mensajes de error técnicos a español
 */
function translateError(message: string): string {
  const msg = message.toLowerCase();

  // Errores de autenticación
  if (msg.includes('invalid login credentials')) {
    return 'Credenciales inválidas. Verifica tu email y contraseña.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Por favor confirma tu email antes de iniciar sesión.';
  }
  if (msg.includes('user not found')) {
    return 'Usuario no encontrado.';
  }
  if (msg.includes('session expired') || msg.includes('jwt expired')) {
    return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
  }

  // Errores de base de datos
  if (msg.includes('duplicate key')) {
    return 'Este registro ya existe en la base de datos.';
  }
  if (msg.includes('foreign key constraint')) {
    return 'No se puede realizar esta operación porque hay datos relacionados.';
  }
  if (msg.includes('not null constraint')) {
    return 'Falta información obligatoria para completar esta acción.';
  }

  // Errores de permisos
  if (msg.includes('policy') || msg.includes('rls')) {
    return 'No tienes permisos para realizar esta acción.';
  }

  // Errores de red
  if (msg.includes('network') || msg.includes('fetch failed')) {
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
  }
  if (msg.includes('timeout')) {
    return 'La solicitud tardó demasiado. Intenta de nuevo.';
  }

  // Errores de validación
  if (msg.includes('required') || msg.includes('must be provided')) {
    return 'Falta completar algunos campos obligatorios.';
  }
  if (msg.includes('invalid email')) {
    return 'El formato del email es inválido.';
  }

  // Por defecto, devolver el mensaje original truncado
  return message.length > 150 
    ? message.substring(0, 150) + '...' 
    : message;
}

