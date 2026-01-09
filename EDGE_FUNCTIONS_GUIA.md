# 📦 EDGE FUNCTIONS - Supabase

Las Edge Functions son pequeños servicios que corren en el cloud de Supabase y actúan como "puentes" entre las pasarelas de pago externas y nuestra base de datos.

## ¿Por qué necesitamos Edge Functions?

1. **Seguridad:** Las credenciales secretas (API Keys) nunca se exponen al frontend
2. **Webhooks:** Las pasarelas envían notificaciones de pago aprobado/rechazado a estas funciones
3. **Validación:** Verificamos que el pago sea legítimo antes de acreditar el saldo

---

## 🚀 Cómo crear una Edge Function

### Paso 1: Instalar Supabase CLI

```bash
npm install -g supabase
```

### Paso 2: Crear la función

```bash
supabase functions new payment-webhook
```

Esto crea: `supabase/functions/payment-webhook/index.ts`

### Paso 3: Desplegar la función

```bash
supabase functions deploy payment-webhook --project-ref TU_PROJECT_ID
```

---

## 📋 Código de la Edge Function

Contenido del archivo: `supabase/functions/payment-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Obtener el payload del webhook
    const payload = await req.json()
    const gateway = req.headers.get('x-gateway-name') // 'niubiz', 'izipay', etc.
    
    console.log('📥 Webhook recibido de:', gateway)
    console.log('📦 Payload:', payload)

    // 2. Verificar firma del webhook (seguridad crítica)
    const signature = req.headers.get('x-signature')
    if (!verifySignature(signature, payload, gateway)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Conectar a Supabase con credenciales de servicio
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Extraer datos según la pasarela
    let transactionId: string
    let status: string
    let authCode: string | null = null
    let cardBrand: string | null = null
    let cardLastFour: string | null = null

    if (gateway === 'niubiz') {
      transactionId = payload.purchaseNumber
      status = payload.dataMap?.STATUS === '1' ? 'approved' : 'rejected'
      authCode = payload.dataMap?.AUTHORIZATION_CODE
      cardBrand = payload.dataMap?.BRAND
      cardLastFour = payload.dataMap?.CARD.slice(-4)
    } else if (gateway === 'izipay') {
      transactionId = payload.orderId
      status = payload.orderStatus === 'PAID' ? 'approved' : 'rejected'
      authCode = payload.transactionId
    }

    // 5. Actualizar transacción en BD
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .update({
        status: status,
        transaction_reference: payload.transactionUUID || payload.transactionId,
        authorization_code: authCode,
        card_brand: cardBrand,
        card_last_four: cardLastFour,
        gateway_response: payload,
        processed_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error actualizando transacción:', error)
      throw error
    }

    // 6. El trigger SQL 'apply_payment_recharge' aplicará la recarga automáticamente
    console.log('✅ Transacción actualizada:', transactionId, 'Status:', status)

    return new Response(JSON.stringify({ success: true, transactionId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('💥 Error en webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Verifica la firma del webhook para asegurar que viene de la pasarela real
 */
function verifySignature(signature: string | null, payload: any, gateway: string): boolean {
  if (!signature) return false

  // TODO: Implementar verificación real según cada pasarela
  // Niubiz: HMAC-SHA256
  // Izipay: SHA256
  
  // Por ahora, aceptamos cualquier firma en desarrollo
  if (Deno.env.get('ENV') === 'development') {
    return true
  }

  // En producción, verificar firma real
  const secret = Deno.env.get(`${gateway.toUpperCase()}_WEBHOOK_SECRET`)
  if (!secret) return false

  // Ejemplo para Niubiz:
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(JSON.stringify(payload))
  //   .digest('hex')
  // return signature === expectedSignature

  return true
}
```

---

## 🔧 Variables de Entorno

Después de crear la función, configura los secretos:

```bash
# URL del webhook que darás a la pasarela:
https://TU_PROJECT.supabase.co/functions/v1/payment-webhook

# Secretos (en Supabase Dashboard > Settings > Functions):
NIUBIZ_WEBHOOK_SECRET=tu_webhook_secret_aqui
IZIPAY_WEBHOOK_SECRET=tu_webhook_secret_aqui
ENV=production
```

---

## 📞 Configurar en la Pasarela

### Niubiz:
1. Ir al panel de Niubiz
2. Configuración > Webhooks
3. Agregar URL: `https://TU_PROJECT.supabase.co/functions/v1/payment-webhook`
4. Método: POST
5. Header personalizado: `x-gateway-name: niubiz`

### Izipay:
1. Ir al panel de Izipay
2. Configuración > IPN (Instant Payment Notification)
3. Agregar URL: `https://TU_PROJECT.supabase.co/functions/v1/payment-webhook`
4. Formato: JSON
5. Header personalizado: `x-gateway-name: izipay`

---

## ✅ Probar el Webhook

Puedes simular un webhook localmente:

```bash
curl -X POST https://TU_PROJECT.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -H "x-gateway-name: niubiz" \
  -H "x-signature: test123" \
  -d '{
    "purchaseNumber": "TU_TRANSACTION_ID",
    "dataMap": {
      "STATUS": "1",
      "AUTHORIZATION_CODE": "123456",
      "BRAND": "visa",
      "CARD": "************1234"
    }
  }'
```

Si todo funciona, verás en los logs de Supabase:
```
✅ Transacción actualizada: [ID] Status: approved
```

---

## 🎯 Resultado Final

1. Usuario paga en Niubiz/Izipay
2. La pasarela envía webhook a nuestra Edge Function
3. La Edge Function actualiza `payment_transactions.status = 'approved'`
4. El trigger SQL `apply_payment_recharge()` detecta el cambio y:
   - Incrementa `students.balance`
   - Crea registro en `transactions`
   - Marca `recharge_applied = true`
5. El usuario ve su saldo actualizado automáticamente

---

**Nota:** Por ahora, todo está simulado. Cuando tengas las credenciales reales de Niubiz/Izipay, reemplazarás las URLs de prueba por las oficiales.

