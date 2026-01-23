# 📅 SISTEMA DE DELAY DE VISUALIZACIÓN DE COMPRAS

## 🎯 PROPÓSITO

Permitir que las compras se muestren a los padres con X días de retraso, dando tiempo al kiosco para pasar las ventas del cuaderno al sistema y evitando reclamos por "deudas que aparecen después de pagar".

---

## ❗ IMPORTANTE: ESTO ES UN PARCHE TEMPORAL

⚠️ **Este sistema NO soluciona el problema raíz**, solo lo mitiga.

### Problema Real:
- Ventas se anotan en cuaderno durante recreo
- Se pasan al sistema 1-2 días después (aunque digan "mismo día")
- No se validan recargas ni topes en tiempo real
- NFC no servirá si siguen usando cuaderno

### Solución Definitiva:
**Eliminar el cuaderno** y registrar TODO en el sistema al momento:
- Tablet/celular en kiosco
- Sistema NFC (solo si se abandona el cuaderno)
- Dos personas: una atiende, otra registra

---

## 🔧 CÓMO FUNCIONA

### 1. Configuración por Sede
Cada sede configura cuántos días de retraso quiere:
- **0 días**: En vivo (sin delay) - Requiere pasar todo al sistema al momento
- **1 día**: Padres ven hasta ayer
- **2 días**: DEFAULT - Padres ven hasta anteayer
- **3-5 días**: Para sedes con más demora
- **Personalizado**: Cualquier número de días

### 2. Aplicación Automática
El filtro se aplica **transparentemente** en:
- ✅ Historial de compras
- ✅ Lista de deudas pendientes
- ✅ Saldo mostrado en portal

Los padres **NO ven** ningún mensaje sobre el delay.

### 3. Recargas
**Las recargas se ven EN VIVO** (sin delay) porque:
- El padre necesita confirmar que su pago llegó
- No hay riesgo de "aparición posterior"
- Se registran directamente en el sistema

---

## 📋 COMPONENTES IMPLEMENTADOS

### 1. Base de Datos
**Archivo**: `SETUP_PURCHASE_VISIBILITY_DELAY.sql`

**Tabla**: `purchase_visibility_delay`
```sql
- school_id (UUID) - Sede
- delay_days (INTEGER) - Días de retraso (default: 2)
- applies_to (TEXT) - 'purchases' (solo compras, no recargas)
- updated_by (UUID) - Quién modificó
- created_at, updated_at
```

**Funciones**:
- `get_purchase_visibility_delay(school_id)` - Retorna delay de una sede
- `get_visibility_cutoff_date(school_id)` - Calcula fecha límite

**RLS Policies**:
- Admin General: Ve y edita TODAS las sedes
- Gestor Unidad: Solo su sede
- SuperAdmin: Ve y edita TODO

### 2. Frontend - Configuración
**Archivo**: `src/components/sales/PurchaseVisibilityConfig.tsx`

Panel de configuración con:
- Lista de todas las sedes (o solo la suya si es Gestor)
- Estadísticas: sedes en vivo vs con delay
- Radio buttons para elegir días
- Campo personalizado para otros valores
- Guardar por sede

### 3. Frontend - Aplicación del Filtro

**Archivo**: `src/components/parent/PurchaseHistoryModal.tsx`
```typescript
// Calcula fecha límite
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - delayDays);

// Aplica filtro
.lte('created_at', cutoffDateISO)
```

**Archivo**: `src/components/parent/PaymentsTab.tsx`
```typescript
// Mismo filtro aplicado a deudas pendientes
.lte('created_at', cutoffDateISO)
```

### 4. Integración en Módulo de Ventas
**Archivo**: `src/pages/SalesList.tsx`

Nueva pestaña: **"⚙️ Config. Visualización"**
- Accesible para Admin General y Gestores de Unidad
- Muestra componente `PurchaseVisibilityConfig`

---

## 🎨 INTERFAZ DE USUARIO

### Para Admin General:
```
┌─────────────────────────────────────────────────────┐
│ 📊 Sedes Configuradas: 3    ✅ En Vivo: 0          │
│ ⏳ Con Delay: 3                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🏫 Sede Lima                                        │
│ ⏳ 2 días de retraso              [Configurar]     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🏫 Sede Callao                                      │
│ ⏳ 5 días de retraso              [Configurar]     │
└─────────────────────────────────────────────────────┘
```

### Formulario de Configuración:
```
¿Con cuánto retraso mostrar las compras a los padres?

○ En vivo - Sin retraso
○ 1 día atrás
● 2 días atrás (Recomendado)
○ 3 días atrás
○ 5 días atrás
○ Personalizado: [__] días

[Guardar Configuración] [Cancelar]
```

### Para Gestor de Unidad:
Solo ve SU sede, no puede ver otras.

### Para Padres:
**NO VEN NADA**. El filtro es transparente.

---

## 🔍 EJEMPLOS DE USO

### Ejemplo 1: Sede con cuaderno (delay 2 días)
```
Hoy: 24 de enero, 2026

Compras reales en el sistema:
- 24/01: S/ 10 (recreo de hoy, anotado en cuaderno)
- 23/01: S/ 15 (pasado ayer al sistema)
- 22/01: S/ 12 (pasado antier al sistema)
- 21/01: S/ 8

Padre ve en el portal (delay 2 días):
- 22/01: S/ 12 ✅
- 21/01: S/ 8 ✅
- (NO ve 23/01 ni 24/01 aún)

En 1 día más verá:
- 23/01: S/ 15

En 2 días verá:
- 24/01: S/ 10
```

### Ejemplo 2: Sede sin cuaderno (en vivo)
```
Configuración: 0 días (en vivo)

Compras en el sistema:
- 24/01 14:35: S/ 10

Padre ve inmediatamente:
- 24/01 14:35: S/ 10 ✅
```

---

## 📊 VENTAJAS

1. ✅ **Evita reclamos** de padres por deudas que "aparecen después"
2. ✅ **Configurable por sede** según su realidad operativa
3. ✅ **Transparente** para padres (no ven mensajes confusos)
4. ✅ **Mantiene recargas en vivo** (experiencia positiva)
5. ✅ **Fácil de ajustar** cuando mejoren procesos

---

## ⚠️ DESVENTAJAS

1. ❌ **No soluciona el problema raíz** (cuaderno)
2. ❌ **Padres ven saldo "antiguo"** (no completamente actualizado)
3. ❌ **No valida topes ni recargas** en tiempo real
4. ❌ **Es un parche**, no una solución definitiva

---

## 🚀 INSTRUCCIONES DE INSTALACIÓN

### Paso 1: Ejecutar SQL
```bash
# En Supabase SQL Editor:
1. Abrir SETUP_PURCHASE_VISIBILITY_DELAY.sql
2. Copiar TODO el contenido
3. Pegar en SQL Editor
4. Click en "Run"
5. Verificar: ✅ "Sistema de delay de visualización instalado"
```

### Paso 2: Reiniciar servidor
```bash
Ctrl + C
npm run dev
```

### Paso 3: Verificar
1. Login como Admin General
2. Ir a: Módulo de Ventas → Config. Visualización
3. Verificar que aparezcan todas las sedes con delay default: 2 días

### Paso 4: Configurar (opcional)
Ajustar el delay de cada sede según necesidad.

---

## 🧪 PRUEBAS

### Test 1: Verificar delay default
```sql
SELECT 
  s.name as sede,
  pvd.delay_days as delay,
  pvd.created_at
FROM purchase_visibility_delay pvd
JOIN schools s ON s.id = pvd.school_id;
```

**Esperado**: Todas las sedes activas con `delay_days = 2`

### Test 2: Cambiar delay de una sede
1. Ir a Config. Visualización
2. Elegir "Sede Lima"
3. Cambiar a "1 día atrás"
4. Guardar
5. Verificar en SQL que cambió

### Test 3: Portal de padres
1. Login como padre de estudiante en "Sede Lima"
2. Ir a Historial de Compras
3. Verificar en consola del navegador (F12):
   ```
   📅 Filtro de delay aplicado: { delayDays: 2, cutoffDate: '22/01/2026' }
   ```
4. Solo deben aparecer compras hasta hace 2 días

### Test 4: Recargas en vivo
1. Como padre, hacer una recarga
2. Verificar que aparece INMEDIATAMENTE en el saldo
3. No debe tener delay

---

## 📞 MENSAJE PARA LA DUEÑA

```
Hola Fiorella,

He implementado una solución temporal para evitar los reclamos 
de padres por "deudas que aparecen después de pagar":

✅ SOLUCIÓN IMPLEMENTADA:
Los padres verán sus compras con 2 días de retraso por defecto.
Esto da tiempo para pasar las ventas del cuaderno al sistema.

⚙️ CONFIGURABLE:
Cada sede puede ajustar cuántos días de retraso necesita
(1, 2, 3, 5 días, o elegir "en vivo" si pasan todo al momento).

⚠️ IMPORTANTE:
Esto es un PARCHE, no la solución definitiva. Para que
recargas y topes funcionen correctamente, necesitamos:

1. Eliminar el cuaderno para ventas
2. Registrar TODO en el sistema al momento
3. Opciones: tablet en kiosco, NFC (sin cuaderno), o 2 personas

¿Podemos coordinar para evaluar cuál opción funciona mejor?

Saludos,
Alberto
```

---

**Fecha**: 22 enero, 2026  
**Versión**: 1.2.5  
**Estado**: ✅ Completado y listo para usar
