# 🛡️ SISTEMA DE PERMISOS GRANULARES + MULTI-SEDE
## Lima Café 28 - ERP Profesional por ARQUISIA

---

## 📋 ÍNDICE

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Instalación en Supabase](#instalación-en-supabase)
4. [Cómo Usar el Sistema](#cómo-usar-el-sistema)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 1. INTRODUCCIÓN

Este documento describe el **Sistema de Permisos Granulares** implementado en el ERP de Lima Café 28. Este sistema permite:

✅ **Control de permisos tipo Spatie** (inspirado en Laravel Spatie Permission)
✅ **Aislamiento multi-sede** (cada usuario solo ve su sede)
✅ **Permisos por rol** (configuración general)
✅ **Permisos individuales** (otorgar o revocar permisos específicos)
✅ **Botones deshabilitados con candado** si el usuario no tiene permiso

### 🎯 Problema que Resuelve

**Antes:**
- Un cajero podía anular ventas sin supervisión
- Todos los usuarios veían todas las sedes
- No había control granular de acciones

**Ahora:**
- Cada botón verifica permisos
- El Cajero ve el botón "Anular Venta" **DESHABILITADO** con un candado 🔒
- Solo el Admin General puede anular ventas
- Un padre de Nordic **NO** ve el menú de Sagrado Corazón

---

## 2. ARQUITECTURA DEL SISTEMA

### 🗄️ Estructura de Base de Datos

```sql
┌─────────────────────────────────────────────────────┐
│  TABLAS PRINCIPALES                                 │
├─────────────────────────────────────────────────────┤
│  1. permissions                                     │
│     - id (UUID)                                     │
│     - name (ej: "ventas.anular")                    │
│     - description                                   │
│     - module (ej: "ventas", "productos")            │
│                                                     │
│  2. role_permissions                                │
│     - role (admin_general, pos, comedor, parent)    │
│     - permission_id (FK a permissions)              │
│                                                     │
│  3. user_permissions                                │
│     - user_id (FK a auth.users)                     │
│     - permission_id (FK a permissions)              │
│     - granted (true/false)                          │
│                                                     │
│  4. profiles (actualizada)                          │
│     + school_id (FK a schools) ← NUEVA COLUMNA      │
└─────────────────────────────────────────────────────┘
```

### 🔐 Lógica de Permisos

**Orden de Evaluación:**
1. ¿Es SuperAdmin? → ✅ **Todos los permisos**
2. ¿Tiene permiso revocado individualmente? → ❌ **No tiene permiso**
3. ¿Tiene permiso otorgado individualmente? → ✅ **Tiene permiso**
4. ¿Su rol tiene el permiso? → ✅ **Tiene permiso**
5. Caso contrario → ❌ **No tiene permiso**

**Ejemplo:**
- **Cajero1** (rol `pos`):
  - Su rol `pos` tiene: `ventas.ver`, `ventas.crear`, `ventas.imprimir`
  - Su rol `pos` NO tiene: `ventas.anular`, `ventas.editar`
  - Admin le otorga individualmente: `ventas.anular` ✅
  - Resultado: Cajero1 puede anular ventas, los demás cajeros NO

---

## 3. INSTALACIÓN EN SUPABASE

### Paso 1: Ejecutar el Script SQL

1. Abrir Supabase → SQL Editor
2. Copiar todo el contenido de `SISTEMA_PERMISOS_MULTISEDE.sql`
3. Pegar y ejecutar ▶️

**¿Qué hace este script?**
- Crea las 3 tablas nuevas (`permissions`, `role_permissions`, `user_permissions`)
- Agrega `school_id` a la tabla `profiles`
- Inserta 25+ permisos base del sistema
- Configura permisos por defecto para cada rol:
  - `admin_general`: **Todos los permisos**
  - `pos`: Solo `ventas.ver`, `ventas.crear`, `ventas.imprimir`
  - `comedor`: Solo `ventas.ver`, `productos.ver`
  - `parent`: Solo `estudiantes.ver`, `estudiantes.recargar`
- Crea RLS Policies para aislamiento por sede
- Crea función `user_has_permission()` para verificar permisos

### Paso 2: Verificar la Instalación

Ejecutar en SQL Editor:

```sql
-- Ver todos los permisos
SELECT * FROM permissions ORDER BY module, name;

-- Ver permisos del rol 'pos'
SELECT p.name, p.description 
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role = 'pos';

-- Verificar que school_id existe en profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'school_id';
```

---

## 4. CÓMO USAR EL SISTEMA

### 4.1. Módulo de Control de Permisos (Admin General)

**Ruta:** `/permissions`

**Acceso:** Solo `admin_general` y `superadmin`

#### Pestaña: "Por Rol"

Aquí configuras permisos para **todos los usuarios de un rol**.

**Ejemplo:**
1. Seleccionar rol: `Cajero (POS)`
2. Expandir módulo: `Ventas`
3. Marcar:
   - ☑️ `ventas.ver` (Ver lista de ventas)
   - ☑️ `ventas.crear` (Realizar ventas en POS)
   - ☑️ `ventas.imprimir` (Reimprimir tickets)
   - ☐ `ventas.editar` ← **Desactivado**
   - ☐ `ventas.anular` ← **Desactivado**
4. Hacer clic en **"Guardar Cambios"**

**Resultado:**
- **Todos** los cajeros pueden ver, crear e imprimir
- **Ningún** cajero puede editar ni anular

#### Pestaña: "Por Usuario"

Aquí otorgas permisos **individuales** a un usuario específico.

**Ejemplo:**
1. Seleccionar usuario: `cajero1@nordic.com`
2. Su rol base es: `POS`
3. Buscar permiso: `ventas.anular`
4. Hacer clic en el botón (cambia de gris → verde)
5. Hacer clic en **"Guardar Cambios"**

**Resultado:**
- **Solo** `cajero1@nordic.com` puede anular ventas
- Los demás cajeros siguen sin poder hacerlo

**Estados del botón:**
- 🔵 **Gris**: Heredado del rol (no tiene permiso)
- 🟢 **Verde con candado abierto**: Permiso otorgado individualmente
- 🔴 **Rojo con candado cerrado**: Permiso revocado individualmente

---

### 4.2. Módulo de Gestión de Padres

**Ruta:** `/parents`

**Acceso:** Solo `admin_general` y `superadmin`

#### ¿Para qué sirve?

Crear perfiles de padres **desde el Admin**, sin que tengan que registrarse por el link QR.

#### Paso a Paso:

1. Hacer clic en **"Crear Padre"**
2. **Seleccionar Sede** (OBLIGATORIO):
   - Ejemplo: `Nordic - Naciones Unidas`
   - **Importante:** El padre SOLO verá el menú de esa sede
3. Llenar datos:
   - Email: `padre1@ejemplo.com`
   - Contraseña: `123456` (mínimo 6 caracteres)
   - Nombre Completo: `Juan Pérez`
   - DNI: `12345678` (opcional)
   - Teléfono: `987654321` (opcional)
   - Dirección: `Av. Principal 123` (opcional)
4. Hacer clic en **"Crear Padre"**

**¿Qué hace el sistema?**
1. Crea el usuario en Supabase Auth
2. Crea su perfil en `profiles` con `role='parent'` y `school_id`
3. Crea su ficha en `parent_profiles`
4. El padre puede iniciar sesión con su email/contraseña
5. Al entrar a la app, solo verá productos de su sede

---

### 4.3. Aislamiento Multi-Sede

#### ¿Cómo Funciona?

**Regla de Oro:**
> Cada usuario tiene un `school_id` en su perfil. Las consultas automáticamente filtran por ese `school_id`.

**Ejemplo 1: Cajero de Nordic**
- Usuario: `cajero1@nordic.com`
- `school_id`: `abc-123-nordic`
- Cuando hace una venta, se guarda con `school_id = abc-123-nordic`
- En "Lista de Ventas", solo ve ventas de Nordic

**Ejemplo 2: Padre de Sagrado Corazón**
- Usuario: `padre5@gmail.com`
- `school_id`: `xyz-456-sagrado`
- En "Menú", solo ve productos con `school_id = xyz-456-sagrado`
- No ve productos de Nordic ni otras sedes

**Excepciones:**
- `superadmin`: Ve **todas** las sedes
- `admin_general`: Puede cambiar de sede con un selector

#### RLS Policies Aplicadas

```sql
-- Transacciones: Solo tu sede
CREATE POLICY "aislamiento_transactions_por_sede" ON transactions
FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin_general', 'superadmin')
  OR
  school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- Productos: Solo tu sede
CREATE POLICY "aislamiento_products_por_sede" ON products
FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin_general', 'superadmin')
  OR
  school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- Estudiantes: Solo tu sede (o tus hijos si eres padre)
CREATE POLICY "aislamiento_students_por_sede" ON students
FOR SELECT USING (
  parent_id = auth.uid()
  OR
  (
    auth.jwt() ->> 'role' IN ('admin_general', 'pos', 'comedor', 'superadmin')
    AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
);
```

---

## 5. EJEMPLOS PRÁCTICOS

### Ejemplo 1: Deshabilitar botón "Anular Venta" para Cajeros

**Archivo:** `src/components/admin/SalesList.tsx`

```tsx
import { PermissionButton } from '@/components/PermissionButton';

// En el render de la lista de ventas:
<PermissionButton
  permission="ventas.anular"
  variant="ghost"
  size="sm"
  onClick={() => handleOpenAnnul(transaction)}
  fallbackMessage="Solo Admin General puede anular ventas"
  showLockIcon={false}
>
  <Trash2 className="h-4 w-4 text-red-600" />
</PermissionButton>
```

**Resultado:**
- Si el usuario tiene permiso: Botón **activo** ✅
- Si NO tiene permiso: Botón **deshabilitado** con candado 🔒 y tooltip explicativo

---

### Ejemplo 2: Verificar Permisos en Código

**Archivo:** Cualquier componente

```tsx
import { usePermissions } from '@/hooks/usePermissions';

export default function MiComponente() {
  const { can, cannot, canAny, canAll } = usePermissions();

  // Verificar un permiso
  if (can('ventas.anular')) {
    // Usuario puede anular ventas
  }

  // Verificar que NO tiene permiso
  if (cannot('productos.eliminar')) {
    // Usuario NO puede eliminar productos
  }

  // Verificar si tiene ALGUNO de estos permisos
  if (canAny(['ventas.editar', 'ventas.anular'])) {
    // Tiene al menos uno
  }

  // Verificar si tiene TODOS estos permisos
  if (canAll(['productos.ver', 'productos.editar'])) {
    // Tiene ambos
  }

  return <div>...</div>;
}
```

---

### Ejemplo 3: Crear un Padre con Sede Específica

**Flujo Manual (Admin):**
1. Ir a `/parents`
2. Clic en "Crear Padre"
3. Seleccionar: **Sagrado Corazón**
4. Email: `maria@gmail.com`
5. Crear

**Resultado:**
- María inicia sesión
- Va a "Menú" en la app de padres
- Solo ve: Productos de Sagrado Corazón
- NO ve: Productos de Nordic ni otras sedes

**Flujo QR (Padre se auto-registra):**
1. Padre escanea QR de Nordic
2. Link: `/#/register?school=NRD`
3. Se registra con Google
4. Sistema detecta `school=NRD` y asigna `school_id` automáticamente
5. Resultado: Mismo aislamiento

---

## 6. PREGUNTAS FRECUENTES

### ¿Qué pasa si un Cajero intenta anular una venta sin permiso?

El botón "Anular Venta" aparece **deshabilitado** con un candado 🔒. Al pasar el mouse, ve un tooltip:
> "No tienes permiso para realizar esta acción. Permiso requerido: `ventas.anular`"

---

### ¿Cómo otorgo permisos especiales a un solo usuario?

1. Ir a `/permissions`
2. Pestaña: "Por Usuario"
3. Seleccionar el usuario
4. Buscar el permiso
5. Hacer clic en el botón (cambia a verde)
6. Guardar

---

### ¿Un padre puede ver estudiantes de otras sedes?

**NO**. La RLS Policy verifica:
- Si es padre: Solo ve `students` donde `parent_id = su_id`
- Si es staff: Solo ve `students` donde `school_id = su_school_id`

---

### ¿Cómo agrego un nuevo permiso al sistema?

Ejecutar en SQL Editor:

```sql
INSERT INTO permissions (name, description, module)
VALUES ('inventario.transferir', 'Transferir productos entre sedes', 'inventario');
```

Luego asignar a roles:

```sql
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin_general', id FROM permissions WHERE name = 'inventario.transferir';
```

---

### ¿El SuperAdmin puede ver todas las sedes?

**SÍ**. Las RLS Policies tienen una excepción:

```sql
auth.jwt() ->> 'role' = 'superadmin'
```

---

### ¿Cómo borro un padre?

1. Ir a `/parents`
2. Buscar al padre
3. Clic en el icono de basura 🗑️
4. Confirmar

**Nota:** Si el padre tiene hijos registrados, el sistema NO lo deja eliminar. Primero debe eliminar a los estudiantes.

---

## 🎉 CONCLUSIÓN

Ahora tienes un sistema completo de:
- ✅ Permisos granulares tipo Spatie
- ✅ Aislamiento multi-sede automático
- ✅ Botones deshabilitados con candado
- ✅ Control por rol e individual
- ✅ Gestión de padres con asignación de sede

**¿Necesitas ayuda?**
Contacta a ARQUISIA - Desarrolladores del ERP Lima Café 28

---

**Última actualización:** 4 de Enero, 2026  
**Versión del Sistema:** 1.0.7 BETA  
**Desarrollado con ❤️ por ARQUISIA**

