# 💰 Guía: Conectar Cajón de Dinero a Impresora Térmica

## 📋 Requisitos

### Hardware Necesario
1. **Impresora térmica** con puerto para cajón de dinero (RJ-11/RJ-12)
2. **Cajón de dinero** con cable RJ-11/RJ-12
3. **Cable RJ-11** (generalmente incluido con el cajón)

### Identificar el Puerto del Cajón
La mayoría de impresoras térmicas tienen un puerto que dice:
- `DK` (Drawer Kick)
- `CASH DRAWER`
- `RJ-11` o `RJ-12`

---

## 🔌 Conexión Física

### Paso 1: Conectar el Cajón a la Impresora
```
[Computadora] --USB--> [Impresora Térmica] --RJ11--> [Cajón de Dinero]
```

1. **Apaga** la impresora
2. Conecta el cable RJ-11 del cajón al puerto `CASH DRAWER` de la impresora
3. Conecta la impresora a la corriente
4. Enciende la impresora

### Paso 2: Verificar Conexión

#### Prueba Manual (mayoría de cajones)
Los cajones tienen una **llave** en la parte frontal:
- Gira la llave a posición "1" = Cajón abierto siempre (no se cierra)
- Gira la llave a posición "2" = Cajón controlado por impresora (normal)
- Gira la llave a posición "0" = Cajón cerrado (no se puede abrir)

**Para uso normal**: Deja la llave en posición **"2"**

---

## ⚙️ Configuración en el Sistema

### 1. Ejecutar Migración SQL

Ve a **Supabase SQL Editor** y ejecuta:

```sql
-- Migración ya está en: supabase/migrations/ADD_CASH_DRAWER_CONFIG.sql
```

Esto agrega las columnas necesarias a la tabla `printer_configs`.

### 2. Configurar desde el Admin

1. Ve a **Configuración → Impresoras**
2. Edita la configuración de tu impresora
3. Activa las siguientes opciones:

| Opción | Descripción | Valor Recomendado |
|--------|-------------|-------------------|
| **Abrir Cajón de Dinero** | Habilita la apertura automática | ✅ Activado |
| **Pin del Cajón** | Pin 2 (estándar) o Pin 5 (alternativo) | `2` (defecto) |
| **Abrir en ventas generales** | Efectivo/Tarjeta | ✅ Activado |
| **Abrir en ventas a crédito** | Ventas a cuenta | ❌ Desactivado |
| **Abrir en ventas de profesores** | Profesores | ❌ Desactivado |

---

## 🧪 Probar el Cajón

### Opción A: Desde el POS
1. Abre el **módulo POS**
2. Agrega un producto al carrito
3. Haz una venta en **efectivo**
4. El cajón debería abrirse automáticamente al imprimir

### Opción B: Comando Manual (QZ Tray)
Si tienes QZ Tray instalado, puedes abrir la consola del navegador (F12) y ejecutar:

```javascript
// Abrir cajón manualmente
qz.print(qz.configs.create("TU_IMPRESORA"), ['\x1B\x70\x00\x19\x19']);
```

---

## 🔧 Solución de Problemas

### El cajón NO se abre

#### 1️⃣ Verificar Conexión Física
```bash
✅ Cable RJ-11 bien conectado
✅ Impresora encendida
✅ Cajón tiene corriente
✅ Llave en posición "2"
```

#### 2️⃣ Verificar Configuración
- Ve a **Configuración → Impresoras**
- Verifica que "Abrir Cajón de Dinero" esté **activado**
- Verifica que el tipo de venta correcto tenga activado el cajón

#### 3️⃣ Probar con Otro Pin
Algunas impresoras usan el **pin 5** en lugar del pin 2:
- Cambia `cash_drawer_pin` de `2` a `5`
- Vuelve a intentar

#### 4️⃣ Comandos Alternativos
Si aún no funciona, algunas impresoras usan comandos diferentes:

En `src/lib/printerService.ts`, puedes probar estos comandos alternativos:

```typescript
// Comando estándar (actual)
OPEN_DRAWER_1: '\x1B\x70\x00\x19\x19'

// Alternativas a probar:
OPEN_DRAWER_ALT1: '\x1B\x70\x00\x32\xFA'  // Epson
OPEN_DRAWER_ALT2: '\x10\x14\x01\x00\x01' // Star Micronics
OPEN_DRAWER_ALT3: '\x1C\x70\x00'          // Citizen
```

---

## 📚 Información Técnica

### Comandos ESC/POS para Cajón

| Comando | Hexadecimal | Descripción |
|---------|-------------|-------------|
| Pin 2 | `1B 70 00 19 19` | Abrir cajón conectado al pin 2 (estándar) |
| Pin 5 | `1B 70 01 19 19` | Abrir cajón conectado al pin 5 (alternativo) |

### Formato del Comando
```
ESC p m t1 t2
27  112 0  25 25  (decimal)
1B  70  00 19 19  (hexadecimal)

m  = Pin (0 = pin 2, 1 = pin 5)
t1 = Tiempo ON  (25 = 50ms)
t2 = Tiempo OFF (25 = 50ms)
```

---

## 🎯 Mejores Prácticas

### ✅ Configuración Recomendada
- **Ventas en efectivo**: Abrir cajón ✅
- **Ventas con tarjeta**: Abrir cajón ✅
- **Ventas a crédito**: NO abrir cajón ❌
- **Ventas de profesores**: NO abrir cajón ❌

### 🔒 Seguridad
- Mantén la llave del cajón en lugar seguro
- Usa la llave en posición "2" durante operación normal
- En caso de emergencia, gira a posición "1" para abrir manualmente

---

## 📞 Soporte

Si después de seguir esta guía el cajón no se abre:
1. Verifica el modelo de tu impresora
2. Consulta el manual de la impresora para el comando específico
3. Prueba los comandos alternativos mencionados arriba
4. Contacta al soporte técnico con:
   - Modelo de impresora
   - Modelo de cajón
   - Logs de la consola (F12)
