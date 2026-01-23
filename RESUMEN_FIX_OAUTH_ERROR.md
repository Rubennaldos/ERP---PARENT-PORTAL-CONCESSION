# 🚨 ERROR 500 EN REGISTRO OAUTH GOOGLE

## 📋 Problema Reportado
Cuando un padre intenta registrarse usando Google OAuth, el callback falla con:
```json
{"code":500,"error_code":"unexpected_failure","msg":"Unexpected failure, please check server logs for more information"}
```

## 🔍 Causa Probable
Este error ocurre típicamente por:
1. **Trigger de perfiles faltante o corrupto** → No se crea el registro en `profiles` después del login OAuth
2. **Políticas RLS bloqueando inserts** → Las políticas impiden la creación automática del perfil
3. **Redirect URLs no configuradas** → Supabase rechaza el callback por URL no autorizada

## ✅ Solución Implementada

### 📄 Archivo: `FIX_OAUTH_ERROR_500.sql`

**Ejecuta este script en Supabase Dashboard → SQL Editor**

El script hace lo siguiente:

1. **Recrea el Trigger `handle_new_user()`**
   - Crea automáticamente un perfil en `profiles` cuando alguien se registra con OAuth
   - Asigna rol `parent` por defecto
   - Maneja el caso donde el perfil ya existe (ON CONFLICT)

2. **Arregla Políticas RLS en `profiles`**
   - Permite que el trigger del sistema inserte perfiles
   - Permite que usuarios autenticados vean y actualicen su propio perfil
   - Permite que Admin General vea todos los perfiles

3. **Arregla Políticas RLS en `parent_profiles`**
   - Permite que padres creen su propio registro

4. **Incluye Verificaciones**
   - Consulta para ver la estructura de `profiles`
   - Consulta para ver todas las políticas RLS activas

## 🌐 Configuración Adicional en Supabase

**IMPORTANTE:** Después de ejecutar el SQL, verifica en Supabase Dashboard:

1. Ve a: **Authentication → URL Configuration**
2. En "Redirect URLs", asegúrate que estén estas URLs:
   ```
   http://localhost:8081
   http://localhost:8080
   http://localhost:5173
   https://parent-portal-connect.vercel.app
   https://parent-portal-connect.vercel.app/
   ```
   (Nota el último con la `/` final)

3. En "Site URL", debe estar:
   ```
   https://parent-portal-connect.vercel.app
   ```

## 🧪 Cómo Probar

1. Ejecuta `FIX_OAUTH_ERROR_500.sql` en Supabase
2. Verifica las redirect URLs en Supabase Dashboard
3. Intenta registrarte nuevamente con Google
4. Si aún falla, revisa los logs de Supabase:
   - Dashboard → Logs → Functions/Auth
   - Busca el timestamp del error y mira el detalle

## 📊 Verificación Post-Fix

Después de ejecutar el script, verifica que:
- El trigger `on_auth_user_created` existe
- Las políticas RLS permiten inserts en `profiles`
- Las redirect URLs están configuradas

## 🔄 Próximos Pasos

Si el error persiste después del fix:
1. Revisar logs de Supabase (Functions/Auth)
2. Verificar que `profiles` table tenga todos los campos necesarios
3. Verificar que no haya conflictos de unique constraints
4. Considerar crear una función de onboarding manual para OAuth

---

**Fecha:** 22 de Enero, 2026  
**Versión:** v1.2.5-beta  
**Contexto:** Fix crítico para permitir registro con Google OAuth
