import { supabase } from '@/lib/supabase';

// Diccionario de traducción de errores técnicos a mensajes amigables
const ERROR_TRANSLATIONS: Record<string, string> = {
  // Errores de autenticación
  'Invalid login credentials': 'Correo o contraseña incorrectos. Por favor, verifica tus datos.',
  'User already registered': 'Este correo ya está registrado. ¿Olvidaste tu contraseña?',
  'Email not confirmed': 'Por favor, confirma tu correo electrónico antes de iniciar sesión.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  
  // Errores de base de datos
  'duplicate key value violates unique constraint "parent_profiles_dni_key"': 
    'Este DNI ya está registrado en el sistema. Si crees que es un error, contacta con soporte.',
  'null value in column': 'Falta completar información obligatoria. Por favor, revisa todos los campos.',
  'violates foreign key constraint': 'Error de referencia en la base de datos. Contacta con soporte técnico.',
  'violates not-null constraint': 'Falta información obligatoria. Por favor, completa todos los campos requeridos.',
  
  // Errores de red
  'Failed to fetch': 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.',
  'Network request failed': 'No se pudo conectar al servidor. Por favor, verifica tu conexión.',
  'NetworkError': 'Error de red. Comprueba tu conexión a internet.',
  
  // Errores de validación
  'Email inválido': 'Por favor, ingresa un correo electrónico válido.',
  'Mínimo 6 caracteres': 'La contraseña debe tener al menos 6 caracteres.',
  'Las contraseñas no coinciden': 'Las contraseñas ingresadas no coinciden. Por favor, verifica.',
  
  // Errores de permisos
  'Permission denied': 'No tienes permisos para realizar esta acción.',
  'Unauthorized': 'Sesión expirada. Por favor, inicia sesión nuevamente.',
  
  // Errores genéricos
  'An error occurred': 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
};

// Tipos de errores
export type ErrorType = 'auth' | 'database' | 'validation' | 'network' | 'permission' | 'unknown';

interface ErrorLogData {
  errorType?: ErrorType;
  errorCode?: string;
  errorMessage: string;
  pageUrl?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

/**
 * Traduce un mensaje de error técnico a uno amigable para el usuario
 */
export function translateError(errorMessage: string): string {
  // Buscar traducción exacta
  if (ERROR_TRANSLATIONS[errorMessage]) {
    return ERROR_TRANSLATIONS[errorMessage];
  }
  
  // Buscar traducción por coincidencia parcial
  for (const [key, value] of Object.entries(ERROR_TRANSLATIONS)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }
  
  // Si no hay traducción, devolver mensaje genérico
  return 'Ha ocurrido un error. Por favor, intenta nuevamente o contacta con soporte si el problema persiste.';
}

/**
 * Detecta el tipo de error basándose en el mensaje
 */
function detectErrorType(errorMessage: string, errorCode?: string): ErrorType {
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('login') || msg.includes('auth') || msg.includes('password') || msg.includes('credential')) {
    return 'auth';
  }
  if (msg.includes('constraint') || msg.includes('duplicate key') || msg.includes('foreign key') || msg.includes('not-null')) {
    return 'database';
  }
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
    return 'validation';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('connection')) {
    return 'network';
  }
  if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return 'permission';
  }
  
  return 'unknown';
}

/**
 * Registra un error en la base de datos y devuelve el mensaje traducido
 */
export async function logError(error: Error | string, data?: Partial<ErrorLogData>): Promise<string> {
  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const translatedMessage = translateError(errorMessage);
    const errorType = data?.errorType || detectErrorType(errorMessage, data?.errorCode);
    
    // Obtener información del usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = 'guest';
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      userRole = profile?.role || 'unknown';
    }
    
    // Preparar datos del log
    const logData = {
      user_id: user?.id || null,
      user_email: user?.email || 'anonymous',
      user_role: userRole,
      error_type: errorType,
      error_code: data?.errorCode || null,
      error_message: errorMessage,
      error_translated: translatedMessage,
      page_url: data?.pageUrl || window.location.href,
      component: data?.component || null,
      action: data?.action || null,
      user_agent: navigator.userAgent,
      stack_trace: data?.stackTrace || (typeof error === 'object' && error.stack) || null,
      metadata: data?.metadata || null,
    };
    
    // Insertar en la base de datos (sin esperar respuesta para no bloquear)
    supabase
      .from('error_logs')
      .insert(logData)
      .then(({ error: insertError }) => {
        if (insertError) {
          console.error('❌ Error logging to database:', insertError);
        }
      });
    
    // Devolver mensaje traducido inmediatamente
    return translatedMessage;
    
  } catch (loggingError) {
    console.error('❌ Error in logError function:', loggingError);
    return translateError(typeof error === 'string' ? error : error.message);
  }
}

/**
 * Hook personalizado para manejar errores de forma consistente
 */
export function useErrorHandler() {
  const handleError = async (
    error: Error | string,
    options?: {
      component?: string;
      action?: string;
      showToast?: boolean;
      metadata?: Record<string, any>;
    }
  ) => {
    const translatedMessage = await logError(error, {
      component: options?.component,
      action: options?.action,
      metadata: options?.metadata,
    });
    
    console.error('🔴 Error:', error);
    console.info('💬 Mensaje al usuario:', translatedMessage);
    
    return translatedMessage;
  };
  
  return { handleError };
}

// Export para uso directo
export { ERROR_TRANSLATIONS };

