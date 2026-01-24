# 📋 GUÍA: NUEVO FLUJO DE REGISTRO DE PADRES

## 🎯 FLUJO IMPLEMENTADO

```
┌─────────────────────────────────────────────────────────────┐
│                   /register                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [🔵 Continuar con Google]                            │ │
│  │  [📱 Continuar con Microsoft]                         │ │
│  │                                                        │ │
│  │  ─────────── o ───────────                            │ │
│  │                                                        │ │
│  │  [✉️ ¿Quieres hacerlo manualmente?]                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │
           ├─── Opción 1: Google/Microsoft (OAuth)
           │    │
           │    ├─ Popup de Google/Microsoft
           │    ├─ 📧 Email de confirmación
           │    └─ Click en link del email → /onboarding
           │
           └─── Opción 2: Manual
                │
                ├─ Modal: Email, Contraseña, Confirmar Contraseña
                ├─ 📧 Email de confirmación
                └─ Click en link del email → /onboarding

┌─────────────────────────────────────────────────────────────┐
│                   /onboarding                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ✅ Email Confirmado                                  │ │
│  │                                                        │ │
│  │  Colegio/Sede: [Selecciona tu colegio ▼]            │ │
│  │                                                        │ │
│  │  ☑ Acepto Términos y Condiciones                     │ │
│  │                                                        │ │
│  │  [Continuar →]                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│         /onboarding (Paso 2: Agregar Estudiantes)           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Agrega a tus Hijos                                   │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Estudiante 1                                     │ │ │
│  │  │ Nombre: [_________________]                      │ │ │
│  │  │ Grado: [______]  Sección: [______]              │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  [+ Agregar otro hijo]                                │ │
│  │                                                        │ │
│  │  [🎉 Finalizar y Entrar al Portal]                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  / (Portal de Padres)                        │
│                  ¡Bienvenido! 🎉                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 ARCHIVOS MODIFICADOS

### 1. **src/pages/Register.tsx**
   - ✅ Rediseñado con botones sociales prominentes
   - ✅ Modal para registro manual
   - ✅ OAuth redirecciona a `/onboarding`
   - ✅ Registro manual envía email y redirecciona a `/onboarding`

### 2. **src/pages/Onboarding.tsx** (NUEVO)
   - ✅ Paso 1: Seleccionar sede y aceptar términos
   - ✅ Paso 2: Agregar estudiantes (nombre, grado, sección)
   - ✅ Marca `onboarding_completed = true` al finalizar
   - ✅ Redirecciona a `/` (Portal de Padres)

### 3. **src/contexts/AuthContext.tsx**
   - ✅ `emailRedirectTo` apunta a `/onboarding` (no más a `/#/`)
   - ✅ Compatible con BrowserRouter

### 4. **src/App.tsx**
   - ✅ Ruta `/onboarding` ya existe y protegida con `allowedRoles={['parent']}`

### 5. **FIX_OAUTH_TRIGGER_V2.sql** (NUEVO)
   - ✅ `handle_new_user()` crea `parent_profiles` SIN `school_id`
   - ✅ `onboarding_completed = false` por defecto
   - ✅ Compatible con el nuevo flujo

---

## 📧 FLUJO DE CONFIRMACIÓN DE EMAIL

### ¿Cómo funciona Supabase Email Confirmation?

Cuando un usuario se registra (OAuth o manual), Supabase:

1. **Crea el usuario en `auth.users`** con `email_confirmed_at = NULL`
2. **Envía un email de confirmación** con un link especial:
   ```
   https://tu-proyecto.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=/onboarding
   ```
3. **El usuario hace click en el link del email**
4. **Supabase confirma el email** y redirecciona a `/onboarding`
5. **El trigger `handle_new_user`** se ejecuta y crea `profiles` + `parent_profiles`

### ✅ Configuración en Supabase Dashboard

Para que funcione correctamente, debes configurar:

1. **Ir a Supabase Dashboard** → Tu proyecto → **Authentication** → **URL Configuration**
2. **Site URL**: `https://parent-portal-connect.vercel.app`
3. **Redirect URLs** (agregar):
   - `https://parent-portal-connect.vercel.app/onboarding`
   - `https://parent-portal-connect.vercel.app/auth`
   - `https://parent-portal-connect.vercel.app/register`
   - `http://localhost:5173/onboarding` (para desarrollo local)

4. **Email Templates** → **Confirm signup**:
   - Asegúrate de que el template contenga `{{ .ConfirmationURL }}`
   - El template por defecto de Supabase ya lo tiene

---

## 🧪 TESTING DEL FLUJO

### Opción 1: OAuth (Google)

1. Ir a `https://parent-portal-connect.vercel.app/register`
2. Click en **"🔵 Continuar con Google"**
3. Seleccionar cuenta de Google
4. ✅ **Supabase envía email de confirmación**
5. Abrir email → Click en "Confirmar Email"
6. ✅ **Redirige a `/onboarding`**
7. Seleccionar sede + Aceptar términos → **Continuar**
8. Agregar estudiantes → **Finalizar y Entrar al Portal**
9. ✅ **Redirige a `/` (Portal de Padres)**

### Opción 2: Registro Manual

1. Ir a `https://parent-portal-connect.vercel.app/register`
2. Click en **"✉️ ¿Quieres hacerlo manualmente?"**
3. Ingresar email, contraseña, confirmar contraseña
4. Click en **"Crear Cuenta"**
5. ✅ **Supabase envía email de confirmación**
6. Abrir email → Click en "Confirmar Email"
7. ✅ **Redirige a `/onboarding`**
8. (Continúa igual que OAuth)

---

## 🛠️ SCRIPTS SQL NECESARIOS

### 1. **Ejecutar el trigger actualizado**

```sql
-- En Supabase SQL Editor:
-- Copiar y pegar el contenido de FIX_OAUTH_TRIGGER_V2.sql
```

Este script:
- ✅ Crea `profiles` con `role = 'parent'`
- ✅ Crea `parent_profiles` con `onboarding_completed = false`
- ✅ NO asigna `school_id` (se asigna en onboarding)

---

## 🚀 PRÓXIMOS PASOS

### 1. Ejecutar el SQL
```bash
# En Supabase Dashboard → SQL Editor
# Ejecutar: FIX_OAUTH_TRIGGER_V2.sql
```

### 2. Desplegar a Vercel
```bash
git add .
git commit -m "feat: Nuevo flujo de registro con onboarding separado"
git push origin main
```

### 3. Configurar URLs en Supabase
Ver sección "✅ Configuración en Supabase Dashboard"

### 4. Testear el flujo completo
- OAuth con Google
- Registro manual
- Verificar emails de confirmación
- Verificar redirecciones

---

## ❓ PREGUNTAS FRECUENTES

### ¿Por qué el email de confirmación es necesario?

Supabase **siempre** envía un email de confirmación para verificar que el email es real y pertenece al usuario. Esto:
- ✅ Evita registros falsos
- ✅ Asegura que el usuario tiene acceso al email
- ✅ Cumple con buenas prácticas de seguridad

### ¿Puedo deshabilitar la confirmación de email?

Sí, pero **NO RECOMENDADO**. Para deshabilitar:

1. Supabase Dashboard → **Authentication** → **Settings**
2. **Email Auth** → Desmarcar "Enable email confirmations"

⚠️ **ADVERTENCIA**: Esto permite que usuarios se registren con emails falsos.

### ¿Qué pasa si el usuario no confirma su email?

El usuario:
- ✅ Está creado en `auth.users`
- ❌ No puede iniciar sesión
- ❌ `email_confirmed_at = NULL`
- 📧 Puede solicitar reenvío del email

### ¿Cómo reenviar el email de confirmación?

En la página `/auth`, agregar un botón "Reenviar email de confirmación" que llame a:

```typescript
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: userEmail,
});
```

---

## 📊 ESTADOS DEL USUARIO

| Estado | auth.users | profiles | parent_profiles | Puede Acceder |
|--------|-----------|----------|-----------------|---------------|
| 1. Registrado (sin confirmar) | ✅ email_confirmed_at = NULL | ❌ No existe | ❌ No existe | ❌ Nada |
| 2. Email Confirmado (sin onboarding) | ✅ Confirmado | ✅ role = parent | ✅ onboarding_completed = false | ⚠️ Solo /onboarding |
| 3. Onboarding Completo | ✅ Confirmado | ✅ role = parent | ✅ onboarding_completed = true | ✅ Portal de Padres |

---

## ✅ CHECKLIST FINAL

- [x] `src/pages/Register.tsx` rediseñado
- [x] `src/pages/Onboarding.tsx` creado
- [x] `src/contexts/AuthContext.tsx` actualizado
- [x] `FIX_OAUTH_TRIGGER_V2.sql` creado
- [ ] SQL ejecutado en Supabase
- [ ] URLs configuradas en Supabase Dashboard
- [ ] Desplegado a Vercel
- [ ] Testeado flujo OAuth
- [ ] Testeado flujo Manual
- [ ] Verificar emails de confirmación

---

¡El nuevo flujo está listo para implementar! 🚀
