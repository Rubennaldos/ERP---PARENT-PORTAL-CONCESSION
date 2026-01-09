/**
 * Servicio de integración con Pasarelas de Pago
 * Soporta: Niubiz, Izipay, Culqi, Mercado Pago
 */

import { supabase } from '@/lib/supabase';

export interface PaymentRequest {
  amount: number;
  studentId: string;
  paymentMethod: 'card' | 'yape' | 'plin' | 'bank_transfer';
  gateway?: 'niubiz' | 'izipay' | 'culqi' | 'mercadopago' | 'manual';
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled';
  payment_gateway: string;
  payment_method: string;
  transaction_reference?: string;
  created_at: string;
}

/**
 * Inicia una transacción de pago
 * Crea el registro en la BD y devuelve el ID para tracking
 */
export async function initiatePayment(
  request: PaymentRequest,
  userId: string
): Promise<{ transaction: PaymentTransaction; checkoutUrl?: string }> {
  try {
    // 1. Determinar la pasarela según el método de pago
    const gateway = request.gateway || determineGateway(request.paymentMethod);

    // 2. Validar que la pasarela esté activa
    const { data: gatewayConfig, error: configError } = await supabase
      .from('payment_gateway_config')
      .select('*')
      .eq('gateway_name', gateway)
      .eq('is_active', true)
      .single();

    if (configError || !gatewayConfig) {
      throw new Error(`La pasarela ${gateway} no está disponible en este momento`);
    }

    // 3. Validar monto mínimo y máximo
    if (request.amount < gatewayConfig.min_amount) {
      throw new Error(`El monto mínimo es S/ ${gatewayConfig.min_amount.toFixed(2)}`);
    }
    if (request.amount > gatewayConfig.max_amount) {
      throw new Error(`El monto máximo es S/ ${gatewayConfig.max_amount.toFixed(2)}`);
    }

    // 4. Crear transacción en BD (estado: pending)
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        student_id: request.studentId,
        amount: request.amount,
        currency: 'PEN',
        payment_gateway: gateway,
        payment_method: request.paymentMethod,
        status: 'pending',
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      })
      .select()
      .single();

    if (txError) throw txError;

    // 5. Generar URL de checkout según la pasarela
    let checkoutUrl: string | undefined;

    if (gateway === 'niubiz') {
      checkoutUrl = await generateNiubizCheckout(transaction.id, request.amount, gatewayConfig);
    } else if (gateway === 'izipay') {
      checkoutUrl = await generateIzipayCheckout(transaction.id, request.amount, request.paymentMethod, gatewayConfig);
    } else if (gateway === 'manual') {
      // Pago manual: no hay URL, el admin verificará manualmente
      checkoutUrl = undefined;
    }

    console.log('✅ Transacción creada:', transaction.id, 'Gateway:', gateway);

    return {
      transaction,
      checkoutUrl,
    };
  } catch (error: any) {
    console.error('❌ Error al iniciar pago:', error);
    throw new Error(error.message || 'Error al procesar el pago');
  }
}

/**
 * Determina qué pasarela usar según el método de pago
 */
function determineGateway(paymentMethod: string): string {
  if (paymentMethod === 'card') {
    return 'niubiz'; // Niubiz es mejor para tarjetas
  } else if (paymentMethod === 'yape' || paymentMethod === 'plin') {
    return 'izipay'; // Izipay soporta Yape/Plin
  } else if (paymentMethod === 'bank_transfer') {
    return 'manual'; // Verificación manual
  }
  return 'niubiz'; // Default
}

/**
 * Genera URL de checkout de Niubiz (Visa)
 */
async function generateNiubizCheckout(
  transactionId: string,
  amount: number,
  config: any
): Promise<string> {
  try {
    // En producción, esto llamaría a una Edge Function que se comunica con Niubiz
    // Por ahora, devolvemos una URL de simulación
    
    const baseUrl = config.is_production
      ? 'https://apiprod.vnforapps.com'
      : 'https://apisandbox.vnforapps.com';

    // TODO: Implementar llamada real a Edge Function
    // const response = await fetch('/api/niubiz/session', {
    //   method: 'POST',
    //   body: JSON.stringify({ transactionId, amount, merchantId: config.merchant_id })
    // });

    // Por ahora, URL de simulación
    const checkoutUrl = `${baseUrl}/checkout?merchantId=${config.merchant_id}&amount=${amount * 100}&purchaseNumber=${transactionId}`;
    
    console.log('🔗 Niubiz Checkout URL:', checkoutUrl);
    return checkoutUrl;
  } catch (error) {
    console.error('Error generando checkout Niubiz:', error);
    throw error;
  }
}

/**
 * Genera URL de checkout de Izipay (Yape, Plin, Tarjetas)
 */
async function generateIzipayCheckout(
  transactionId: string,
  amount: number,
  paymentMethod: string,
  config: any
): Promise<string> {
  try {
    // En producción, esto llamaría a una Edge Function que genera el formToken
    const baseUrl = config.is_production
      ? 'https://api.micuentaweb.pe'
      : 'https://api.micuentaweb.pe'; // Izipay usa el mismo dominio

    // TODO: Implementar llamada real a Edge Function
    // const response = await fetch('/api/izipay/order', {
    //   method: 'POST',
    //   body: JSON.stringify({ transactionId, amount, paymentMethod, shopId: config.merchant_id })
    // });

    // Por ahora, URL de simulación
    const checkoutUrl = `${baseUrl}/checkout?orderId=${transactionId}&amount=${amount * 100}&method=${paymentMethod}`;
    
    console.log('🔗 Izipay Checkout URL:', checkoutUrl);
    return checkoutUrl;
  } catch (error) {
    console.error('Error generando checkout Izipay:', error);
    throw error;
  }
}

/**
 * Consulta el estado de una transacción
 */
export async function getPaymentStatus(
  transactionId: string
): Promise<PaymentTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al consultar estado de pago:', error);
    return null;
  }
}

/**
 * Cancela una transacción pendiente
 */
export async function cancelPayment(transactionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId)
      .eq('status', 'pending');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al cancelar pago:', error);
    return false;
  }
}

/**
 * Obtiene las pasarelas disponibles para el usuario
 */
export async function getAvailableGateways(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('payment_gateway_config')
      .select('gateway_name, min_amount, max_amount, is_active')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener pasarelas:', error);
    return [];
  }
}

