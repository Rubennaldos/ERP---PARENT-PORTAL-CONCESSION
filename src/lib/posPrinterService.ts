/**
 * Servicio de Impresión para POS
 * Maneja la impresión automática de tickets y comandas según configuración
 */

import { supabase } from './supabase';
import { 
  printTicketDirect, 
  generateTicketContent, 
  generateComandaContent,
  isQZTrayAvailable 
} from './printerService';

interface PrintConfig {
  printer_device_name: string;
  business_name: string;
  business_ruc: string | null;
  business_address: string | null;
  business_phone: string | null;
  print_header: boolean;
  header_text: string;
  print_footer: boolean;
  footer_text: string;
  auto_cut_paper: boolean;
  cut_mode: 'partial' | 'full';
  qr_prefix: string;
  auto_generate_qr: boolean;
  
  // Comanda
  print_comanda: boolean;
  comanda_header: string;
  print_separate_comanda: boolean;
  comanda_copies: number;
  
  // Por tipo de venta
  print_ticket_general: boolean;
  print_comanda_general: boolean;
  print_ticket_credit: boolean;
  print_comanda_credit: boolean;
  print_ticket_teacher: boolean;
  print_comanda_teacher: boolean;
}

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

interface SaleData {
  ticketCode: string;
  clientName: string;
  cart: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'credit' | 'teacher';
  saleType: 'general' | 'credit' | 'teacher';
  schoolId: string;
}

/**
 * Obtener configuración de impresora para una sede
 */
async function getPrinterConfig(schoolId: string): Promise<PrintConfig | null> {
  try {
    const { data, error } = await supabase
      .from('printer_configs')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn('⚠️ No hay configuración de impresora activa para esta sede');
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error obteniendo configuración de impresora:', error);
    return null;
  }
}

/**
 * Determinar si debe imprimir ticket según tipo de venta y configuración
 */
function shouldPrintTicket(config: PrintConfig, saleType: string): boolean {
  switch (saleType) {
    case 'general':
      return config.print_ticket_general;
    case 'credit':
      return config.print_ticket_credit;
    case 'teacher':
      return config.print_ticket_teacher;
    default:
      return false;
  }
}

/**
 * Determinar si debe imprimir comanda según tipo de venta y configuración
 */
function shouldPrintComanda(config: PrintConfig, saleType: string): boolean {
  if (!config.print_comanda) return false;
  
  switch (saleType) {
    case 'general':
      return config.print_comanda_general;
    case 'credit':
      return config.print_comanda_credit;
    case 'teacher':
      return config.print_comanda_teacher;
    default:
      return false;
  }
}

/**
 * Imprimir venta desde POS
 * Se ejecuta automáticamente después de completar una venta
 */
export async function printPOSSale(saleData: SaleData): Promise<void> {
  try {
    // Verificar si QZ Tray está disponible
    const qzAvailable = await isQZTrayAvailable();
    if (!qzAvailable) {
      console.warn('⚠️ QZ Tray no disponible - Impresión omitida');
      return;
    }

    // Obtener configuración de impresora
    const config = await getPrinterConfig(saleData.schoolId);
    if (!config) {
      console.warn('⚠️ Sin configuración de impresora - Impresión omitida');
      return;
    }

    const printTicket = shouldPrintTicket(config, saleData.saleType);
    const printComanda = shouldPrintComanda(config, saleData.saleType);

    console.log(`🖨️ Imprimiendo venta ${saleData.saleType}:`, {
      ticket: printTicket,
      comanda: printComanda
    });

    // Preparar items para ticket
    const ticketItems = saleData.cart.map(item => ({
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    // Preparar items para comanda
    const comandaItems = saleData.cart.map(item => ({
      name: item.product.name,
      quantity: item.quantity
    }));

    // IMPRIMIR TICKET
    if (printTicket) {
      try {
        const ticketContent = generateTicketContent(
          config.business_name,
          config.business_ruc,
          config.business_address,
          config.business_phone,
          saleData.ticketCode,
          ticketItems,
          saleData.total,
          config.print_header ? config.header_text : undefined,
          config.print_footer ? config.footer_text : undefined
        );

        await printTicketDirect(
          config.printer_device_name,
          ticketContent,
          config.auto_cut_paper,
          config.cut_mode
        );

        console.log('✅ Ticket impreso');
      } catch (error) {
        console.error('❌ Error imprimiendo ticket:', error);
      }
    }

    // IMPRIMIR COMANDA
    if (printComanda) {
      try {
        // Imprimir según número de copias configurado
        for (let i = 0; i < (config.comanda_copies || 1); i++) {
          const comandaContent = generateComandaContent(
            config.comanda_header,
            saleData.ticketCode,
            comandaItems,
            saleData.clientName
          );

          await printTicketDirect(
            config.printer_device_name,
            comandaContent,
            config.auto_cut_paper,
            config.cut_mode
          );

          console.log(`✅ Comanda ${i + 1}/${config.comanda_copies} impresa`);
        }
      } catch (error) {
        console.error('❌ Error imprimiendo comanda:', error);
      }
    }

    if (!printTicket && !printComanda) {
      console.log('ℹ️ No hay nada configurado para imprimir para este tipo de venta');
    }

  } catch (error) {
    console.error('❌ Error general en printPOSSale:', error);
    // No lanzar error - la venta ya se completó exitosamente
  }
}

export default {
  printPOSSale
};
