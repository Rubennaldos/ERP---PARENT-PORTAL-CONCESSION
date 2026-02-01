# 🖨️ GUÍA: Impresión Directa sin Diálogo (Sin Pregunta)

## 🔴 **PROBLEMA ACTUAL:**

1. ❌ `window.print()` **SIEMPRE abre el diálogo de Windows**
2. ❌ **No puede imprimir directo** en navegadores por seguridad
3. ❌ **No corta el papel** automáticamente

---

## ✅ **SOLUCIONES POSIBLES:**

### **OPCIÓN 1: Usar QZ Tray (RECOMENDADO)** ⭐

**QZ Tray** es una aplicación que permite impresión directa desde navegadores.

#### **Ventajas:**
- ✅ Impresión directa sin diálogo
- ✅ Soporte para comandos ESC/POS (corte de papel)
- ✅ Compatible con impresoras térmicas, USB, Red, Bluetooth
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Gratuito y open-source

#### **Instalación:**

1. **Descargar QZ Tray:**
   - https://qz.io/download/
   - Instalar en cada PC con impresora

2. **Instalar librería en el proyecto:**
```bash
npm install qz-tray
```

3. **Configurar certificado (una sola vez):**
```javascript
import qz from 'qz-tray';

// Certificado para firma digital (generado en https://qz.io/download/)
qz.security.setCertificatePromise(function(resolve, reject) {
  fetch('/path/to/digital-certificate.txt')
    .then(data => resolve(data.text()));
});
```

4. **Ejemplo de impresión directa:**
```javascript
const printDirectWithQZ = async () => {
  try {
    // Conectar con QZ Tray
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    // Encontrar impresora
    const printers = await qz.printers.find();
    const printer = printers[0]; // O buscar por nombre

    // Comandos ESC/POS para impresora térmica
    const config = qz.configs.create(printer);
    
    const ticketData = [
      '\x1B\x40',              // Inicializar impresora
      '\x1B\x61\x01',          // Centrar texto
      'LIMA CAFE 28\n',
      'RUC: 20XXXXXXXXX\n',
      '\x1B\x61\x00',          // Alinear izquierda
      '--------------------------------\n',
      'Producto 1        S/ 10.00\n',
      'Producto 2        S/ 15.00\n',
      '--------------------------------\n',
      'TOTAL:            S/ 25.00\n',
      '\n\n\n',
      '\x1D\x56\x42\x00'       // CORTE PARCIAL DE PAPEL ✂️
    ];

    await qz.print(config, ticketData);

    console.log('✅ Impreso correctamente');
  } catch (error) {
    console.error('❌ Error de impresión:', error);
  }
};
```

---

### **OPCIÓN 2: Usar jsPrintManager** 💼

**jsPrintManager** es otra alternativa comercial con más funciones.

#### **Ventajas:**
- ✅ Impresión directa sin diálogo
- ✅ Soporte ESC/POS avanzado
- ✅ Control de corte de papel
- ✅ Soporte para imágenes y logos

#### **Instalación:**
1. Descargar: https://neodynamic.com/downloads/jspm/
2. Instalar cliente en cada PC
3. Licencia de pago (pero tiene trial gratuito)

---

### **OPCIÓN 3: Aplicación Electron (SI ES APP DE ESCRITORIO)** 🖥️

Si conviertes tu web app a Electron, puedes imprimir directo sin diálogo.

```javascript
const { BrowserWindow } = require('electron');

const printDirect = (htmlContent) => {
  let printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURI(htmlContent)}`);
  
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({
      silent: true,        // ✅ SIN DIÁLOGO
      printBackground: true,
      deviceName: 'EPSON TM-T20'  // Nombre de impresora
    }, (success) => {
      if (success) {
        console.log('✅ Impreso');
        printWindow.close();
      }
    });
  });
};
```

---

### **OPCIÓN 4: WebUSB + Comandos ESC/POS Directos** 🔌

Para impresoras USB conectadas directamente (sin drivers).

```javascript
const printViaWebUSB = async () => {
  try {
    // Solicitar acceso a dispositivo USB
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: 0x04b8 }] // Vendor ID de EPSON
    });

    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    // Comandos ESC/POS
    const encoder = new TextEncoder();
    const commands = [
      '\x1B\x40',           // Inicializar
      'TICKET DE PRUEBA\n',
      '\x1D\x56\x42\x00'    // CORTAR PAPEL ✂️
    ];

    for (const cmd of commands) {
      await device.transferOut(1, encoder.encode(cmd));
    }

    await device.close();
  } catch (error) {
    console.error('Error WebUSB:', error);
  }
};
```

---

## 🔪 **COMANDOS ESC/POS PARA CORTE DE PAPEL:**

### **Para Impresoras Térmicas Estándar:**

```javascript
// CORTE PARCIAL (deja un pedacito sin cortar)
const CORTE_PARCIAL = '\x1D\x56\x42\x00';  // ESC i
const CORTE_PARCIAL_ALT = '\x1B\x69';

// CORTE TOTAL (corta completamente)
const CORTE_TOTAL = '\x1D\x56\x41\x00';    // GS V A 0
const CORTE_TOTAL_ALT = '\x1B\x6D';

// AVANZAR PAPEL (antes de cortar)
const AVANZAR_LINEAS = '\x1B\x64\x05';     // Avanzar 5 líneas
```

### **Ejemplo de Uso:**

```javascript
const ticketHTML = `
  <div>
    ${contenidoTicket}
    <div style="display: none;" class="cut-command">
      <!-- Comando de corte insertado aquí -->
    </div>
  </div>
`;
```

---

## 📋 **RECOMENDACIÓN PARA TU PROYECTO:**

### **Implementación Paso a Paso:**

1. **FASE 1 - Corto Plazo (Inmediato):**
   - ✅ Agregar opción "Corte Automático" en configuración
   - ✅ Agregar saltos de página (`page-break-after`) entre ticket y comanda
   - ✅ Configurar la impresora en Windows para que corte automáticamente

2. **FASE 2 - Mediano Plazo (Próxima semana):**
   - ✅ Instalar **QZ Tray** en las PCs con impresoras
   - ✅ Integrar librería `qz-tray` en el proyecto
   - ✅ Crear función `printDirectWithQZ()` para impresión sin diálogo

3. **FASE 3 - Largo Plazo (Opcional):**
   - ✅ Convertir a app Electron para mayor control
   - ✅ O usar WebUSB para impresoras USB directas

---

## ⚙️ **CONFIGURACIÓN EN WINDOWS (SOLUCIÓN TEMPORAL):**

### **Para que la impresora corte automáticamente:**

1. **Ir a Configuración de Windows** → **Dispositivos** → **Impresoras**
2. **Click derecho** en la impresora térmica → **Propiedades**
3. **Pestaña "Avanzadas"**
4. **Activar:**
   - ✅ "Imprimir directamente a la impresora"
   - ✅ "Habilitar características avanzadas de impresión"
5. **Pestaña "Preferencias de impresión"**
6. **Buscar opciones de:**
   - ✅ "Corte automático" → Activar
   - ✅ "Feed después de corte" → 0 mm

---

## 🧪 **PRUEBA RÁPIDA CON QZ TRAY:**

```javascript
// En tu componente PrinterConfiguration.tsx
import qz from 'qz-tray';

const printDirectTest = async () => {
  try {
    // Conectar QZ Tray
    await qz.websocket.connect();
    
    // Obtener impresoras
    const printers = await qz.printers.find();
    console.log('Impresoras disponibles:', printers);
    
    // Configurar impresora
    const config = qz.configs.create(printers[0]);
    
    // Datos con comando de corte
    const data = [
      'TICKET DE PRUEBA\n',
      'Producto 1: S/ 10.00\n',
      '\n\n\n',
      '\x1D\x56\x42\x00'  // ✂️ CORTAR
    ];
    
    // Imprimir
    await qz.print(config, data);
    
    toast({
      title: '✅ Impreso directamente',
      description: 'Sin diálogo de Windows'
    });
  } catch (error) {
    console.error('Error:', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Instala QZ Tray primero'
    });
  }
};
```

---

## 📦 **ARCHIVOS A CREAR/MODIFICAR:**

1. **`src/lib/printerService.ts`** (nueva librería de impresión)
2. **`src/components/admin/PrinterConfiguration.tsx`** (agregar opción de corte)
3. **`package.json`** (agregar `qz-tray`)
4. **Configuración de impresoras en Windows** (manual por cada PC)

---

## 🆘 **PRÓXIMOS PASOS:**

1. ✅ **EJECUTAR SQL** para agregar campo `auto_cut_paper`
2. ✅ **DESCARGAR QZ Tray** en las PCs con impresoras
3. ✅ **INSTALAR librería** `npm install qz-tray`
4. ✅ **MODIFICAR** la función de impresión para usar QZ Tray

**¿Quieres que implemente la integración con QZ Tray ahora?** 🚀
