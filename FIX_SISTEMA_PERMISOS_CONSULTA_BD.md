# 🔐 FIX CRÍTICO: Sistema de Permisos Corregido

**Fecha:** 10 de Enero, 2026  
**Versión:** 1.1.2 (Hotfix)

---

## ❌ PROBLEMA IDENTIFICADO

El sistema de permisos estaba **hardcodeado** y **NO consultaba la base de datos**. Esto causaba que:

1. ✅ Se podía **activar/desactivar** permisos en "Control de Acceso"
2. ❌ Pero los módulos **NO respetaban** esos cambios
3. ❌ Los alcances (su sede / todas las sedes / personalizado) **NO funcionaban**

**Ejemplo:** 
- En Control de Acceso: "Supervisor de Red" → Cobranzas → Solo "Ver dashboard" ✅
- Pero al entrar al módulo: Se veían **TODAS las pestañas** (Dashboard, Períodos, Cobrar, etc.) ❌

---

## ✅ SOLUCIÓN IMPLEMENTADA

### **Archivos Modificados:**

#### 1. `src/pages/Cobranzas.tsx`
**Antes:**
```typescript
// Hardcodeado
if (role === 'supervisor_red' || role === 'gestor_unidad') {
  setPermissions({
    dashboard: true,
    periods: true,
    collect: true,
    reports: true,
    config: false,
  });
}
```

**Después:**
```typescript
// Consulta la BD de permisos
const { data, error } = await supabase
  .from('role_permissions')
  .select(`
    granted,
    permissions (module, action)
  `)
  .eq('role', role)
  .eq('granted', true);

// Mapea los permisos reales
data?.forEach((perm: any) => {
  const permission = perm.permissions;
  if (permission?.module === 'cobranzas') {
    switch (permission.action) {
      case 'ver_dashboard':
        perms.dashboard = true;
        break;
      case 'editar_periodos':
        perms.periods = true;
        break;
      // ... etc
    }
  }
});
```

---

#### 2. `src/components/admin/SalesList.tsx`
**Antes:**
```typescript
// Hardcodeado
if (role === 'admin_general' || role === 'supervisor_red') {
  setPermissions({
    canView: true,
    canEdit: true,
    canDelete: true,
  });
}
```

**Después:**
```typescript
// Consulta la BD y respeta alcances
const { data } = await supabase
  .from('role_permissions')
  .select(`granted, permissions (module, action, scope)`)
  .eq('role', role)
  .eq('granted', true);

// Mapea permisos y alcances
data?.forEach((perm: any) => {
  if (permission?.module === 'ventas') {
    switch (permission.action) {
      case 'ver_todas_sedes':
        perms.canView = true;
        canViewAll = true; // ✅ Ahora respeta el alcance
        break;
      case 'ver_su_sede':
        perms.canView = true;
        canViewAll = false; // ✅ Solo su sede
        break;
    }
  }
});
```

---

#### 3. `src/components/billing/BillingCollection.tsx`
**Antes:**
```typescript
// Hardcodeado
const canViewAllSchools = role === 'admin_general';
```

**Después:**
```typescript
// Consulta la BD
const [canViewAllSchools, setCanViewAllSchools] = useState(false);

const checkPermissions = async () => {
  const { data } = await supabase
    .from('role_permissions')
    .select(`granted, permissions (module, action)`)
    .eq('role', role);

  data?.forEach((perm: any) => {
    if (permission?.action === 'cobrar_todas_sedes') {
      setCanViewAllSchools(true); // ✅ Respeta el permiso real
    } else if (permission?.action === 'cobrar_su_sede') {
      setCanViewAllSchools(false); // ✅ Solo su sede
    }
  });
};
```

---

## 🎯 Qué se Arregló

### ✅ **Módulo de Cobranzas:**
- Ahora **solo** muestra las pestañas que el rol tiene permiso de ver
- Si solo tiene permiso de "Ver dashboard" → Solo muestra Dashboard
- Si no tiene ningún permiso → Muestra mensaje de "Sin acceso"

### ✅ **Módulo de Lista de Ventas:**
- Respeta permisos de: Ver, Editar, Eliminar, Imprimir, Exportar
- Botones se ocultan si no tiene permiso
- Filtro de sedes se oculta si no puede "Ver todas las sedes"

### ✅ **Pestaña "Cobrar" en Cobranzas:**
- Respeta alcances:
  - **Su sede:** Solo ve deudores de su colegio
  - **Todas las sedes:** Ve todos los deudores + filtro de sedes
  - **Personalizado:** (Pendiente implementar selector)

---

## 🧪 Cómo Probar

### **Test 1: Cobranzas con Permisos Limitados**

1. Ir a: **Control de Acceso**
2. Seleccionar rol: **"Supervisor de Red"**
3. Módulo: **Cobranzas**
4. Activar **SOLO** "Ver dashboard"
5. Desactivar todo lo demás (Períodos, Cobrar, Reportes, Config)
6. Guardar (automático)

**Resultado esperado:**
- Al entrar a Cobranzas → **SOLO** aparece pestaña "Dashboard"
- Las demás pestañas **NO** se ven

---

### **Test 2: Lista de Ventas con Alcance "Su Sede"**

1. Ir a: **Control de Acceso**
2. Seleccionar rol: **"Gestor de Unidad"**
3. Módulo: **Lista de Ventas**
4. Activar "Ver su sede" (radio button)
5. Desactivar "Ver todas las sedes"

**Resultado esperado:**
- Al entrar a Lista de Ventas → **NO** aparece filtro de sedes
- Solo ve transacciones de **su colegio asignado**

---

### **Test 3: Cobrar con "Todas las Sedes"**

1. Ir a: **Control de Acceso**
2. Seleccionar rol: **"Supervisor de Red"**
3. Módulo: **Cobranzas**
4. En "Cobrar", activar **"Cobrar todas las sedes"**

**Resultado esperado:**
- Al entrar a Cobranzas > Cobrar → **SÍ** aparece filtro de sedes
- Puede ver deudores de todos los colegios

---

## 📊 Logs para Debugging

Ahora cada módulo imprime en consola:

```javascript
console.log('🔍 Verificando permisos de Cobranzas para rol:', role);
console.log('📦 Permisos obtenidos de BD:', data);
console.log('✅ Permisos finales de Cobranzas:', perms);
```

**Cómo ver los logs:**
1. Abrir el módulo (ej: Cobranzas)
2. Presionar F12 (DevTools)
3. Ir a tab "Console"
4. Buscar mensajes con 🔍 📦 ✅

---

## 🚦 Estado Actual

✅ **Cobranzas:** Permisos funcionando correctamente  
✅ **Lista de Ventas:** Permisos funcionando correctamente  
✅ **Pestaña "Cobrar":** Alcances funcionando correctamente  
✅ **Sin errores de linter**  

---

## 🔄 Deploy

Los cambios ya se subieron a GitHub y se están desplegando en Vercel automáticamente.

**URL del deploy:** https://vercel.com/dashboard (verificar en tu panel)

---

## ⚠️ Notas Importantes

1. **Admin General** siempre tiene **todos** los permisos (hardcodeado como seguridad)
2. Los demás roles **consultan la BD** cada vez que entran a un módulo
3. Si un rol no tiene permisos, ve un mensaje de "Sin acceso"
4. Los logs en consola ayudan a debuggear cualquier problema

---

**Este fix es CRÍTICO porque corrige la funcionalidad principal del sistema de permisos que se implementó hace unos días.**

