# 🛠️ SISTEMA DE CAPTURA DE ERRORES - Guía Completa

## 📋 Resumen

Se ha implementado un **sistema completo de captura y monitoreo de errores** que:

1. ✅ **Captura automáticamente** errores de React (crashes)
2. ✅ **Permite registrar manualmente** errores en try/catch
3. ✅ **Traduce** errores técnicos a español
4. ✅ **Visualiza** estadísticas en Dashboard de Errores
5. ✅ **Permite marcar** errores como resueltos

---

## 🚀 Pasos para Activar

### **Paso 1: Ejecutar SQL en Supabase**

Archivo: `CREAR_SISTEMA_ERROR_LOGGING.sql`

Este script crea:
- Tabla `error_logs`
- Vistas: `error_statistics`, `error_hotspots`, `most_frequent_errors`
- Políticas de seguridad (RLS)
- Función de limpieza automática

```sql
-- Ejecuta todo el contenido del archivo en Supabase SQL Editor
```

---

### **Paso 2: Los Archivos ya están Creados**

✅ `src/hooks/useErrorLogger.ts` - Hook para registrar errores
✅ `src/components/ErrorBoundary.tsx` - Captura errores de React
✅ `src/App.tsx` - Ya integrado con ErrorBoundary

---

## 📖 Cómo Usar en el Código

### **Opción 1: Captura Automática (ErrorBoundary)**

Los errores de React se capturan automáticamente:

```typescript
// NO NECESITAS HACER NADA
// Si un componente falla, se registra automáticamente
function MiComponente() {
  // Si esto falla, ErrorBoundary lo captura
  return <div>{datos.map(...)}</div>;
}
```

---

### **Opción 2: Registro Manual (useErrorLogger)**

Para errores en try/catch:

```typescript
import { useErrorLogger } from '@/hooks/useErrorLogger';

function MiComponente() {
  const { logError } = useErrorLogger();

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*');

      if (error) throw error;

    } catch (error: any) {
      // ✅ Registrar el error
      logError({
        errorType: 'database',
        errorMessage: error.message,
        errorTranslated: 'No se pudieron cargar los estudiantes',
        component: 'MiComponente',
        action: 'fetching_students',
      });

      // Mostrar mensaje al usuario
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los estudiantes',
      });
    }
  };
}
```

---

### **Tipos de Errores Soportados:**

```typescript
errorType?: 'auth' | 'database' | 'validation' | 'network' | 'permission' | 'unknown'
```

- **auth**: Problemas de autenticación (login, sesión)
- **database**: Errores de Supabase/BD
- **validation**: Datos inválidos
- **network**: Problemas de conexión
- **permission**: Sin permisos (RLS)
- **unknown**: Otros

---

## 📊 Cómo Ver los Errores

### **En SuperAdmin > Errores del Sistema**

Verás:

1. **Total Errores** - Últimos 30 días
2. **Usuarios Afectados** - Cuántos usuarios tuvieron errores
3. **Puntos Críticos** - Páginas con más errores
4. **Tasa de Resolución** - % de errores resueltos
5. **Distribución por Tipo** - Gráfico de barras
6. **Puntos de Bloqueo** - Páginas problemáticas
7. **Errores Más Frecuentes** - Top 10
8. **Historial Reciente** - Últimos 50 errores

---

## ✅ Marcar Errores como Resueltos

En el Dashboard de Errores:

1. Ver el error en la lista
2. Click botón **"Resolver"**
3. El error se marca como ✓ Resuelto
4. Se muestra en verde y opaco

---

## 🔍 Ejemplo Práctico

### **Antes (Sin logging):**

```typescript
const fetchStudents = async () => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*');
    
    if (error) throw error;
    
  } catch (error) {
    console.error('Error:', error); // ❌ Solo se ve en consola
    toast({ title: 'Error', description: 'Algo salió mal' });
  }
};
```

### **Después (Con logging):**

```typescript
import { useErrorLogger } from '@/hooks/useErrorLogger';

const fetchStudents = async () => {
  const { logError } = useErrorLogger();
  
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*');
    
    if (error) throw error;
    
  } catch (error: any) {
    // ✅ Se registra en la BD automáticamente
    logError({
      errorType: 'database',
      errorMessage: error.message,
      errorTranslated: 'No se pudieron cargar los estudiantes',
      component: 'StudentsManagement',
      action: 'fetching_students',
    });
    
    toast({ title: 'Error', description: 'No se pudieron cargar los estudiantes' });
  }
};
```

---

## 🧹 Limpieza Automática

Los errores antiguos se limpian automáticamente:

- **Errores resueltos:** Se eliminan después de 90 días
- **Errores no resueltos:** Se eliminan después de 180 días

Para ejecutar manualmente:

```sql
SELECT cleanup_old_errors();
```

---

## 📈 Beneficios

✅ **Visibilidad Total** - Ves todos los errores en un solo lugar
✅ **Proactividad** - Detectas problemas antes que los usuarios reporten
✅ **Trazabilidad** - Sabes quién, cuándo y dónde ocurrió el error
✅ **Priorización** - Ves los errores más frecuentes primero
✅ **Resolución** - Marcas errores como resueltos y trackeas el progreso

---

## ⚠️ Importante

1. **Ejecuta el SQL primero** (`CREAR_SISTEMA_ERROR_LOGGING.sql`)
2. **Usa `logError` en todos los try/catch** de componentes críticos
3. **Revisa el Dashboard regularmente** (diario o semanal)
4. **Marca errores como resueltos** cuando los arregles
5. **Exporta CSV** para análisis fuera del sistema

---

## 🎯 Próximos Pasos Recomendados

1. **HOY:** Ejecutar el SQL en Supabase
2. **HOY:** Verificar que el Dashboard muestre "0 errores"
3. **MAÑANA:** Agregar `useErrorLogger` en componentes críticos:
   - POS (transacciones)
   - Cobranzas (cobros)
   - Lista de Ventas
   - Registro de Estudiantes
4. **SEMANAL:** Revisar Dashboard y resolver errores frecuentes

---

**Con esto, nunca más se te escapará un error sin que lo sepas.** 🎉

