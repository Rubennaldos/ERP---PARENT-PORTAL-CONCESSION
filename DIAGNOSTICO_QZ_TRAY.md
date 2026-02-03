# 🔍 Diagnóstico de Problemas con QZ Tray

## ❌ Errores Comunes y Soluciones

### Error 1: "Closed connection with QZ Tray"
**Causa**: QZ Tray no está corriendo o se cerró inesperadamente

**Solución**:
1. Busca el ícono de QZ Tray en la bandeja del sistema (área de notificaciones)
2. Si no está ahí, abre QZ Tray manualmente:
   - Windows: Busca "QZ Tray" en el menú inicio
   - El ícono debe aparecer en la bandeja (junto al reloj)
3. Verifica que diga "QZ Tray 2.x.x" cuando pases el mouse

### Error 2: "cannot read properties of null (reading 'established')"
**Causa**: La conexión WebSocket se interrumpe antes de establecerse

**Solución**:
1. Cierra TODAS las pestañas del navegador
2. Cierra QZ Tray completamente (clic derecho en el ícono → Exit)
3. Abre QZ Tray de nuevo
4. Abre el navegador y vuelve a intentar

### Error 3: Problemas con Certificado/Firma Digital
**Causa**: Los certificados están causando conflictos

**Solución**: Simplificar la configuración (ver abajo)

---

## 🎯 Solución Rápida: Modo Básico (Sin Firma Digital)

Si sigues con problemas, desactiva temporalmente la firma digital:

### Paso 1: Verificar Estado de QZ Tray
1. Abre QZ Tray (debe estar en la bandeja del sistema)
2. Clic derecho en el ícono → **"Advanced"** → **"Site Manager"**
3. Verifica que `localhost:5173` o tu URL esté en la lista
4. Si no está, agrégalo:
   - Click **"Add Site"**
   - URL: `https://localhost:5173` (o la URL que uses)
   - Marca: **"Allow printing without prompting"**
   - **"Save"**

### Paso 2: Limpiar Navegador
1. Cierra todas las pestañas
2. Limpia caché del navegador (Ctrl + Shift + Delete)
3. Cierra el navegador completamente
4. Abre de nuevo

### Paso 3: Probar Conexión
1. Abre la consola del navegador (F12)
2. Pega esto y presiona Enter:

```javascript
// Verificar si QZ Tray responde
fetch('https://localhost:8182/')
  .then(r => r.text())
  .then(t => console.log('✅ QZ Tray responde:', t))
  .catch(e => console.error('❌ QZ Tray no responde:', e));
```

Si responde "✅ QZ Tray responde: QZ Tray 2.x.x", entonces QZ Tray está funcionando.

---

## 🔄 Solución Alternativa: Usar HTML Printing

Si QZ Tray sigue sin funcionar, el sistema ya tiene un fallback a impresión HTML:

### Ventajas:
- ✅ No requiere QZ Tray
- ✅ Funciona siempre
- ✅ Respeta toda la configuración de impresoras

### Desventajas:
- ❌ Muestra el diálogo de impresión del navegador
- ❌ **NO puede abrir el cajón de dinero** (requiere QZ Tray)

**Para el cajón de dinero ES OBLIGATORIO tener QZ Tray funcionando.**

---

## 🆘 Si Nada Funciona

### Desinstalar y Reinstalar QZ Tray

1. **Desinstalar QZ Tray**:
   - Windows: Panel de Control → Programas → Desinstalar QZ Tray
   - Reinicia la PC

2. **Descargar versión más reciente**:
   - Ve a: https://qz.io/download/
   - Descarga la versión para Windows
   - Instala como administrador

3. **Configurar de nuevo**:
   - Abre QZ Tray
   - Ve a Advanced → Data/Logging → Level: INFO (para ver más detalles)
   - Vuelve a intentar

---

## 📞 Información para Soporte

Si necesitas ayuda, proporciona:

1. **Versión de QZ Tray**: (Clic derecho en ícono → About)
2. **Navegador y versión**: (Chrome/Edge/Firefox)
3. **URL que usas**: (localhost, Vercel, etc.)
4. **Mensaje de error completo**: (captura de consola F12)

---

## ✅ Checklist Rápido

Antes de probar, verifica:

- [ ] QZ Tray está corriendo (ícono en bandeja del sistema)
- [ ] El navegador está usando HTTPS (candado verde)
- [ ] Has dado permisos a QZ Tray (popup "Allow")
- [ ] La impresora está conectada y encendida
- [ ] El cajón está conectado a la impresora con cable RJ-11
