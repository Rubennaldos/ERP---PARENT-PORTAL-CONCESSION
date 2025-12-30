// Configuración de Supabase para Múltiples Entornos
// IMPORTANTE: Solo incluye credenciales PÚBLICAS (anon key)

// 🔍 Detectar entorno automáticamente
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);

const isDevelopment = isLocalhost || 
                     (typeof window !== 'undefined' && (
                       window.location.hostname.includes('dev') ||
                       window.location.hostname.includes('staging')
                     ));

// 🟢 DESARROLLO (para el programador)
// TODO: Reemplaza estos valores cuando crees el proyecto DEV en Supabase
const DEV_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL_DEV || 'https://TU-PROYECTO-DEV.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_DEV || 'tu_anon_key_dev_aqui',
};

// 🔴 PRODUCCIÓN (para el cliente)
const PROD_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://duxqzozoahvrvqseinji.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1IjZsZ2X-_fay6oFVUc2Qg_gzCZRFNU',
};

// Seleccionar configuración según el entorno
export const supabaseConfig = isDevelopment ? DEV_CONFIG : PROD_CONFIG;

// Debug en consola
if (typeof console !== 'undefined') {
  if (isDevelopment) {
    console.log('🔧 ENTORNO: DESARROLLO');
    console.log('📦 Base de datos DEV activa');
    console.log('🌐 URL:', supabaseConfig.url);
  } else {
    console.log('🚀 ENTORNO: PRODUCCIÓN');
    console.log('📦 Base de datos PROD activa');
  }
}

// Validar que las credenciales estén configuradas
if (!supabaseConfig.url || !supabaseConfig.anonKey || 
    supabaseConfig.url.includes('TU-PROYECTO-DEV') ||
    supabaseConfig.anonKey.includes('tu_anon_key_dev')) {
  console.warn('⚠️ ADVERTENCIA: Credenciales de Supabase DEV no configuradas');
  console.log('💡 Para configurar entorno DEV:');
  console.log('   1. Crea un proyecto en Supabase para desarrollo');
  console.log('   2. Reemplaza los valores en DEV_CONFIG');
  console.log('   3. Por ahora usarás la base de datos de PRODUCCIÓN');
}

