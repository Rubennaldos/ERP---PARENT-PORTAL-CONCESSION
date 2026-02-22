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

// 🟢 DESARROLLO (apunta al mismo Supabase de Maracuyá por ahora)
const DEV_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL_DEV || 'https://bezduattsdrepvpwjqgv.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_DEV || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemR1YXR0c2RyZXB2cHdqcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjEyNTcsImV4cCI6MjA4NzI5NzI1N30.TScQQ_RDb_hG6qD4LAwpvcsYtBYZbFkTBqIBaxMyYgo',
};

// 🔴 PRODUCCIÓN (para Maracuyá Tiendas y Concesionarias Saludables)
const PROD_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://bezduattsdrepvpwjqgv.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemR1YXR0c2RyZXB2cHdqcWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjEyNTcsImV4cCI6MjA4NzI5NzI1N30.TScQQ_RDb_hG6qD4LAwpvcsYtBYZbFkTBqIBaxMyYgo',
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

