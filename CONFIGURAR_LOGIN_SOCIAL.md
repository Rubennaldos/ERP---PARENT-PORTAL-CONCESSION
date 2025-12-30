# 🔐 CONFIGURAR LOGIN SOCIAL (OAuth)

## 📌 PROVEEDORES DISPONIBLES:

Vamos a integrar:
1. ✅ **Google** (Gmail)
2. ✅ **Microsoft** (Hotmail, Outlook)
3. ✅ **Apple** (opcional, si lo necesitas)

---

## 🚀 PASO 1: CONFIGURAR EN SUPABASE

### **1. Abrir Supabase Dashboard**
```
https://supabase.com/dashboard
```

### **2. Ir a Authentication**
1. Click en tu proyecto: `parent-portal-connect`
2. En el menú izquierdo: **Authentication** → **Providers**

---

## 🔵 CONFIGURAR GOOGLE (Gmail)

### **Paso 1: Crear Credenciales en Google Cloud**

1. **Ir a Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Crear un proyecto nuevo:**
   - Nombre: `Lima Café 28 - Portal`

3. **Habilitar Google+ API:**
   - Menú → APIs & Services → Library
   - Buscar: "Google+ API"
   - Click "Enable"

4. **Crear credenciales OAuth 2.0:**
   - APIs & Services → Credentials
   - Click "Create Credentials" → OAuth client ID
   - Application type: **Web application**
   - Name: `Lima Café 28 Portal`
   
5. **Authorized redirect URIs:**
   Agregar esta URL (cópiala de Supabase):
   ```
   https://duxqzozoahvrvqseinji.supabase.co/auth/v1/callback
   ```

6. **Copiar:**
   - Client ID
   - Client Secret

### **Paso 2: Pegar en Supabase**

1. Vuelve a Supabase → Authentication → Providers
2. Busca "Google"
3. Click "Enable"
4. Pega:
   - Client ID (from Google)
   - Client Secret (from Google)
5. Click "Save"

---

## 🔷 CONFIGURAR MICROSOFT (Hotmail/Outlook)

### **Paso 1: Crear App en Azure**

1. **Ir a Azure Portal:**
   ```
   https://portal.azure.com/
   ```

2. **Registrar una aplicación:**
   - Azure Active Directory → App registrations
   - Click "New registration"
   - Name: `Lima Café 28 Portal`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**

3. **Redirect URI:**
   - Platform: Web
   - URI:
   ```
   https://duxqzozoahvrvqseinji.supabase.co/auth/v1/callback
   ```

4. **Copiar:**
   - Application (client) ID

5. **Crear Client Secret:**
   - Certificates & secrets → New client secret
   - Description: `Supabase OAuth`
   - Expires: 24 months
   - Copiar el "Value" (solo se muestra una vez)

### **Paso 2: Pegar en Supabase**

1. Vuelve a Supabase → Authentication → Providers
2. Busca "Azure (Microsoft)"
3. Click "Enable"
4. Pega:
   - Client ID
   - Client Secret
5. Click "Save"

---

## 🍎 CONFIGURAR APPLE (Opcional)

Si necesitas Apple Sign In:

1. **Apple Developer Account** (requiere cuenta de desarrollador)
2. Crear App ID y Service ID
3. Configurar en Supabase

(Este es más complejo, dime si lo necesitas y te explico paso a paso)

---

## ✅ VERIFICAR QUE FUNCIONA:

Una vez configurado en Supabase, el código del frontend automáticamente mostrará los botones de:
- 🔵 Continuar con Google
- 🔷 Continuar con Microsoft

---

## 🔐 SEGURIDAD:

### **Ventajas del Login Social:**
- ✅ Los usuarios NO tienen que recordar otra contraseña
- ✅ Google/Microsoft validan la identidad
- ✅ Más seguro (2FA si lo tienen activado)
- ✅ Más rápido para registrarse

### **Datos que recibimos:**
- Email (verificado automáticamente)
- Nombre (si está disponible)
- Foto de perfil (opcional)

---

## 📋 NOTAS IMPORTANTES:

1. **No necesitas aprobar nada:**
   - Google/Microsoft manejan la autenticación
   - Tú solo recibes el email confirmado

2. **Los usuarios pueden:**
   - Registrarse con Google
   - Registrarse con Microsoft
   - O usar email/password tradicional

3. **Todo se guarda en la misma tabla:**
   - `auth.users` en Supabase
   - El sistema identifica automáticamente el método usado

---

## 🚀 PRÓXIMOS PASOS:

1. ✅ Ejecutar `CREAR_7_SEDES.sql` en Supabase
2. ✅ Configurar Google OAuth (arriba)
3. ✅ Configurar Microsoft OAuth (arriba)
4. ✅ El código del frontend ya está listo (lo actualizaré ahora)

---

**¿Listo? Cuando termines de configurar en Supabase, me avisas y te muestro los botones funcionando.** 🎉

