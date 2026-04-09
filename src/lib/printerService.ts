/**
 * 🖨️ Servicio de Impresión con QZ Tray
 * Permite impresión directa sin diálogo de Windows
 * Soporta comandos ESC/POS para corte de papel
 */

import qz from 'qz-tray';
import { setupQZBasic } from './qzConfig';
import { setupQZSigning } from './qzSigning';

// Suprimir el TypeError interno de qz-tray cuando el WebSocket se cierra
// antes de que onopen dispare (Cannot read properties of null 'established')
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.message && event.message.includes("'established'")) {
      event.preventDefault();
    }
  }, true);
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = String(event.reason);
    if (msg.includes("'established'") || msg.includes('QZ Tray')) {
      event.preventDefault();
    }
  });
}

// Comandos ESC/POS para impresoras térmicas
export const ESC_POS = {
  // Inicialización
  INIT: '\x1B\x40',
  
  // Alineación
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  
  // Formato de texto
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  
  // Tamaño de texto
  TEXT_NORMAL: '\x1D\x21\x00',
  TEXT_2X: '\x1D\x21\x11',
  TEXT_3X: '\x1D\x21\x22',
  
  // Corte de papel
  CUT_PARTIAL: '\x1D\x56\x42\x00',  // Corte parcial (recomendado)
  CUT_FULL: '\x1D\x56\x41\x00',     // Corte total
  
  // Alimentación de papel
  FEED_1: '\x1B\x64\x01',
  FEED_3: '\x1B\x64\x03',
  FEED_5: '\x1B\x64\x05',
  
  // Cajón de dinero (Cash Drawer)
  OPEN_DRAWER_1: '\x1B\x70\x00\x19\x19',  // Abrir cajón 1 (conector pin 2)
  OPEN_DRAWER_2: '\x1B\x70\x01\x19\x19',  // Abrir cajón 2 (conector pin 5)
  
  // Nueva línea
  LF: '\x0A'
};

/**
 * Conectar con QZ Tray
 */
export const connectQZ = async (): Promise<boolean> => {
  try {
    if (qz.websocket.isActive()) {
      console.log('✅ QZ Tray ya está conectado');
      return true;
    }

    console.log('🔌 Conectando con QZ Tray...');
    
    // 🔐 Intentar primero con firma digital (impresión silenciosa)
    try {
      setupQZSigning();
      await qz.websocket.connect();
      console.log('✅ QZ Tray conectado con firma digital (sin popups)');
      return true;
    } catch (signingError) {
      console.warn('⚠️ Firma digital no disponible, usando modo básico');
      
      // Fallback: modo básico (con popup)
      setupQZBasic();
      await qz.websocket.connect();
      console.log('✅ QZ Tray conectado en modo básico');
      return true;
    }
  } catch (error) {
    console.error('❌ Error al conectar con QZ Tray:', error);
    return false;
  }
};

/**
 * Desconectar de QZ Tray
 */
export const disconnectQZ = async (): Promise<void> => {
  try {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
      console.log('🔌 QZ Tray desconectado');
    }
  } catch (error) {
    console.error('❌ Error al desconectar QZ Tray:', error);
  }
};

/**
 * Obtener lista de impresoras disponibles
 */
export const getPrinters = async (): Promise<string[]> => {
  try {
    const isConnected = await connectQZ();
    if (!isConnected) {
      throw new Error('No se pudo conectar con QZ Tray');
    }

    const printers = await qz.printers.find();
    console.log('🖨️ Impresoras disponibles:', printers);
    return printers;
  } catch (error) {
    console.error('❌ Error al obtener impresoras:', error);
    throw error;
  }
};

/**
 * Buscar impresora por nombre
 */
export const findPrinterByName = async (printerName: string): Promise<string | null> => {
  try {
    const printers = await getPrinters();
    
    // Buscar coincidencia exacta
    const exactMatch = printers.find(p => p.toLowerCase() === printerName.toLowerCase());
    if (exactMatch) return exactMatch;
    
    // Buscar coincidencia parcial
    const partialMatch = printers.find(p => p.toLowerCase().includes(printerName.toLowerCase()));
    if (partialMatch) return partialMatch;
    
    console.warn(`⚠️ Impresora "${printerName}" no encontrada. Usando predeterminada.`);
    return printers[0] || null;
  } catch (error) {
    console.error('❌ Error al buscar impresora:', error);
    return null;
  }
};

/**
 * Imprimir ticket directo con comandos ESC/POS
 */
export const printTicketDirect = async (
  printerName: string | null,
  ticketContent: string[],
  cutPaper: boolean = true,
  cutMode: 'partial' | 'full' = 'partial',
  openCashDrawer: boolean = false
): Promise<void> => {
  try {
    const isConnected = await connectQZ();
    if (!isConnected) {
      throw new Error('QZ Tray no está conectado. ¿Lo instalaste e iniciaste?');
    }

    // Buscar impresora
    const printer = printerName 
      ? await findPrinterByName(printerName)
      : (await getPrinters())[0];

    if (!printer) {
      throw new Error('No se encontró ninguna impresora disponible');
    }

    console.log(`🖨️ Imprimiendo en: ${printer}`);

    // Configurar impresora
    const config = qz.configs.create(printer);

    // Construir datos con comandos ESC/POS
    const data = [
      ESC_POS.INIT,           // Inicializar impresora
      ...ticketContent,       // Contenido del ticket
      ESC_POS.FEED_3,         // Avanzar 3 líneas
    ];

    // Agregar comando de corte si está activado
    if (cutPaper) {
      data.push(cutMode === 'full' ? ESC_POS.CUT_FULL : ESC_POS.CUT_PARTIAL);
    }

    // 💰 Abrir cajón de dinero si está activado
    if (openCashDrawer) {
      console.log('💰 Abriendo cajón de dinero...');
      data.push(ESC_POS.OPEN_DRAWER_1);  // Comando para abrir cajón
    }

    // Enviar a imprimir
    await qz.print(config, data);
    console.log('✅ Ticket impreso exitosamente');
    if (openCashDrawer) {
      console.log('✅ Cajón de dinero abierto');
    }
  } catch (error: any) {
    console.error('❌ Error al imprimir:', error);
    throw new Error(error.message || 'Error desconocido al imprimir');
  }
};

/**
 * Imprimir ticket con HTML (alternativa)
 */
export const printTicketHTML = async (
  printerName: string | null,
  htmlContent: string
): Promise<void> => {
  try {
    const isConnected = await connectQZ();
    if (!isConnected) {
      throw new Error('QZ Tray no está conectado');
    }

    const printer = printerName 
      ? await findPrinterByName(printerName)
      : (await getPrinters())[0];

    if (!printer) {
      throw new Error('No se encontró ninguna impresora');
    }

    const config = qz.configs.create(printer, {
      colorType: 'blackwhite',
      scaleContent: true,
      rasterize: true
    });

    const data = [{
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: htmlContent
    }];

    await qz.print(config, data);
    console.log('✅ Ticket HTML impreso exitosamente');
  } catch (error: any) {
    console.error('❌ Error al imprimir HTML:', error);
    throw error;
  }
};

/**
 * Verificar si QZ Tray está instalado y activo
 */
export const isQZTrayAvailable = async (): Promise<boolean> => {
  try {
    if (!qz || !qz.websocket) return false;
    if (qz.websocket.isActive()) {
      console.log('✅ QZ Tray ya está activo');
      return true;
    }
    console.log('🔍 Verificando disponibilidad de QZ Tray...');
    try {
      setupQZSigning();
      await qz.websocket.connect();
      console.log('✅ QZ Tray disponible con firma digital');
      return true;
    } catch {
      try {
        setupQZBasic();
        await qz.websocket.connect();
        console.log('✅ QZ Tray disponible en modo básico');
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
};

/**
 * Generar contenido de ticket en formato ESC/POS
 */
export const generateTicketContent = (
  businessName: string,
  ruc: string | null,
  address: string | null,
  phone: string | null,
  orderCode: string,
  items: Array<{ name: string; price: number; quantity: number }>,
  total: number,
  headerText?: string,
  footerText?: string
): string[] => {
  const content: string[] = [];

  // Encabezado centrado
  content.push(ESC_POS.ALIGN_CENTER);
  content.push(ESC_POS.BOLD_ON);
  content.push(businessName + ESC_POS.LF);
  content.push(ESC_POS.BOLD_OFF);

  if (ruc) content.push(`RUC: ${ruc}` + ESC_POS.LF);
  if (address) content.push(address + ESC_POS.LF);
  if (phone) content.push(`Tel: ${phone}` + ESC_POS.LF);

  content.push('================================' + ESC_POS.LF);

  // Título del ticket
  if (headerText) {
    content.push(ESC_POS.BOLD_ON);
    content.push(headerText + ESC_POS.LF);
    content.push(ESC_POS.BOLD_OFF);
  }

  // Información del pedido
  content.push(ESC_POS.ALIGN_LEFT);
  content.push(`Fecha: ${new Date().toLocaleString('es-PE')}` + ESC_POS.LF);
  content.push(`Pedido: ${orderCode}` + ESC_POS.LF);
  content.push('--------------------------------' + ESC_POS.LF);

  // Items
  items.forEach(item => {
    const itemLine = `${item.quantity}x ${item.name}`;
    const priceLine = `S/ ${item.price.toFixed(2)}`;
    const spaces = 32 - itemLine.length - priceLine.length;
    content.push(itemLine + ' '.repeat(Math.max(spaces, 1)) + priceLine + ESC_POS.LF);
  });

  content.push('================================' + ESC_POS.LF);

  // Total
  content.push(ESC_POS.ALIGN_RIGHT);
  content.push(ESC_POS.BOLD_ON);
  content.push(ESC_POS.TEXT_2X);
  content.push(`TOTAL: S/ ${total.toFixed(2)}` + ESC_POS.LF);
  content.push(ESC_POS.TEXT_NORMAL);
  content.push(ESC_POS.BOLD_OFF);

  // Pie de página
  if (footerText) {
    content.push(ESC_POS.LF);
    content.push(ESC_POS.ALIGN_CENTER);
    content.push('--------------------------------' + ESC_POS.LF);
    content.push(footerText + ESC_POS.LF);
  }

  return content;
};

/**
 * Generar contenido de comanda en formato ESC/POS
 */
export const generateComandaContent = (
  comandaHeader: string,
  orderCode: string,
  items: Array<{ name: string; quantity: number; notes?: string }>,
  customerName?: string
): string[] => {
  const content: string[] = [];

  // Encabezado de comanda (destacado)
  content.push(ESC_POS.ALIGN_CENTER);
  content.push(ESC_POS.BOLD_ON);
  content.push(ESC_POS.TEXT_2X);
  content.push(comandaHeader + ESC_POS.LF);
  content.push(ESC_POS.TEXT_NORMAL);
  content.push(ESC_POS.BOLD_OFF);
  content.push('================================' + ESC_POS.LF);

  // Información del pedido
  content.push(ESC_POS.ALIGN_LEFT);
  content.push(ESC_POS.BOLD_ON);
  content.push(`PEDIDO: ${orderCode}` + ESC_POS.LF);
  content.push(`HORA: ${new Date().toLocaleTimeString('es-PE')}` + ESC_POS.LF);
  if (customerName) {
    content.push(`CLIENTE: ${customerName}` + ESC_POS.LF);
  }
  content.push(ESC_POS.BOLD_OFF);
  content.push('--------------------------------' + ESC_POS.LF);

  // Items con cantidad destacada
  content.push(ESC_POS.BOLD_ON);
  content.push('PRODUCTOS:' + ESC_POS.LF);
  content.push(ESC_POS.BOLD_OFF);

  items.forEach(item => {
    content.push(ESC_POS.LF);
    content.push(ESC_POS.BOLD_ON);
    content.push(`${item.quantity}x ${item.name}` + ESC_POS.LF);
    content.push(ESC_POS.BOLD_OFF);
    
    if (item.notes) {
      content.push(`   - ${item.notes}` + ESC_POS.LF);
    }
  });

  content.push('================================' + ESC_POS.LF);
  content.push(ESC_POS.ALIGN_CENTER);
  content.push('Preparar y entregar' + ESC_POS.LF);

  return content;
};

export default {
  connectQZ,
  disconnectQZ,
  getPrinters,
  findPrinterByName,
  printTicketDirect,
  printTicketHTML,
  isQZTrayAvailable,
  generateTicketContent,
  generateComandaContent,
  ESC_POS
};
