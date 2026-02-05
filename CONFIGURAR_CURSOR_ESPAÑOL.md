# 🇪🇸 CÓMO CONFIGURAR CURSOR EN ESPAÑOL

## Método 1: Desde la Interfaz de Cursor (Recomendado)

1. **Abre Cursor**
2. **Presiona `Ctrl + Shift + P`** (o `Cmd + Shift + P` en Mac)
3. **Escribe:** `Configure Display Language`
4. **Selecciona:** `Configure Display Language`
5. **Elige:** `es` (Español)
6. **Reinicia Cursor** cuando te lo pida

## Método 2: Configuración Manual

1. **Abre el menú de configuración:**
   - Presiona `Ctrl + ,` (o `Cmd + ,` en Mac)
   - O ve a: `File` → `Preferences` → `Settings`

2. **Busca "locale"** en la barra de búsqueda

3. **Configura el idioma:**
   - Busca `locale` o `language`
   - Cambia a `es` o `es-ES`

## Método 3: Para el Reconocimiento de Voz (Windows)

El reconocimiento de voz usa la configuración de Windows:

1. **Abre Configuración de Windows:**
   - Presiona `Windows + I`
   - O busca "Configuración" en el menú inicio

2. **Ve a:**
   - `Hora e idioma` → `Voz`
   - O `Time & Language` → `Speech`

3. **Configura el idioma de voz:**
   - En "Idioma de reconocimiento de voz", selecciona **Español (España)** o **Español (México)**
   - Si no está instalado, haz clic en "Agregar idioma" y descarga Español

4. **Reinicia Cursor** después de cambiar la configuración

## Método 4: Configuración del Sistema Operativo

### Windows:
1. Ve a `Configuración` → `Hora e idioma` → `Idioma`
2. Asegúrate de que **Español** esté en la lista de idiomas
3. Si no está, agrega Español como idioma preferido

### Verificar que funciona:
1. Abre Cursor
2. Presiona el botón del micrófono (si está disponible)
3. Habla en español
4. Debería transcribir en español

## Notas Importantes:

- ⚠️ **El reconocimiento de voz depende del sistema operativo**, no solo de Cursor
- 🔄 **Reinicia Cursor** después de cambiar cualquier configuración
- 📝 Si el idioma no cambia, verifica que tengas el paquete de idioma español instalado en Windows
- 🎤 El reconocimiento de voz puede requerir descargar paquetes de idioma adicionales

## Solución de Problemas:

Si después de configurar todo sigue saliendo en inglés:

1. **Verifica el idioma de Windows:**
   ```powershell
   # Abre PowerShell y ejecuta:
   Get-WinSystemLocale
   ```

2. **Instala el paquete de idioma español:**
   - Ve a `Configuración` → `Hora e idioma` → `Idioma`
   - Agrega Español si no está
   - Descarga el paquete de idioma completo

3. **Reinicia completamente Windows** después de instalar el idioma

4. **Verifica en Cursor:**
   - `Ctrl + Shift + P` → `Configure Display Language` → `es`

## Configuración Adicional:

Si quieres que el asistente de Cursor siempre responda en español, puedes agregar esto en tus prompts:

- "Responde siempre en español"
- "Usa español para todas las respuestas"
- O configura el archivo `.vscode/settings.json` que ya creamos

---

**¿Necesitas más ayuda?** Si después de seguir estos pasos sigue en inglés, puede ser que necesites instalar extensiones de idioma adicionales o que Cursor no tenga soporte completo para español en tu región.
