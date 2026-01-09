# 💳 SISTEMA DE PASARELAS DE PAGO - Guía para el Cliente

## 📘 Introducción

Tu sistema ahora permite que los **padres recarguen saldo online** usando tarjetas de crédito/débito, Yape o Plin. Esto elimina la necesidad de que los padres vengan personalmente a recargar.

---

## 🎯 ¿Qué se ha implementado?

### ✅ Para los Padres:
- **Botón "Recargar Saldo"** en su portal
- Pueden elegir entre:
  - 💳 Tarjeta de crédito/débito (Niubiz)
  - 📱 Yape (Izipay)
  - 📱 Plin (Izipay)
  - 🏦 Transferencia bancaria (manual)
- El saldo se acredita **automáticamente** al estudiante

### ✅ Para el Admin General (Dueño):
- **Módulo "Estadísticas de Pagos"** en el dashboard
- Ver transacciones exitosas, pendientes y rechazadas
- Exportar reportes a Excel/CSV
- Filtros por fecha (7 días, 30 días, 3 meses, 1 año)

### ✅ Para el Programador (SuperAdmin):
- **Pestaña "Pasarelas de Pago"** en SuperAdmin
- Configurar credenciales de Niubiz, Izipay, etc.
- Activar/desactivar pasarelas
- Cambiar entre modo prueba y producción

---

## 🚀 Activación Paso a Paso

### Paso 1: Ejecutar el SQL (Programador)

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto > SQL Editor
3. Abrir y ejecutar: **`SISTEMA_CUENTA_LIBRE_Y_PAGOS.sql`**
4. Verificar que se crearon las tablas:
   - `payment_transactions`
   - `payment_gateway_config`

### Paso 2: Contratar Pasarela de Pagos (Dueño)

#### Opción A: Niubiz (Tarjetas)
1. Ir a [niubiz.com.pe](https://www.niubiz.com.pe/)
2. Contactar ventas: (01) 311-9898
3. Documentos necesarios:
   - RUC de la empresa
   - Documento de constitución
   - Cuenta bancaria en BCP/Interbank
4. Te darán:
   - **Merchant ID**
   - **API Key**
   - **API Secret**
5. Comisión: ~2.5% + S/ 0.30 por transacción

#### Opción B: Izipay (Yape/Plin/Tarjetas)
1. Ir a [secure.micuentaweb.pe](https://secure.micuentaweb.pe/)
2. Contactar ventas: (01) 708-5000
3. Documentos similares a Niubiz
4. Te darán:
   - **Shop ID**
   - **Public Key**
   - **Private Key**
5. Comisión: ~3.44% + S/ 0.50 por transacción

**Recomendación:** Si tu público usa mucho Yape, contrata **Izipay**. Si prefieres comisiones más bajas, **Niubiz**.

### Paso 3: Configurar en el Sistema (Programador)

1. Ir a **SuperAdmin** (https://tu-app.vercel.app/#/superadmin)
2. Pestaña: **Pasarelas de Pago**
3. Seleccionar la pasarela (ej: Niubiz)
4. Pegar las credenciales:
   - Merchant ID
   - API Key
   - API Secret
5. **Modo Producción:** Dejar en **OFF** para probar primero
6. **Pasarela Activa:** Activar **ON**
7. Guardar

### Paso 4: Probar (Dueño)

1. Crear una cuenta de prueba como "padre"
2. Ir al portal de padres
3. Click en "Recargar Saldo"
4. Ingresar S/ 10.00
5. Elegir método de pago
6. Click "Proceder al Pago"
7. Completar el pago en la ventana que se abre
8. **Verificar que el saldo se actualice automáticamente**

### Paso 5: Activar Producción (Programador)

Cuando las pruebas funcionen:

1. Ir a SuperAdmin > Pasarelas de Pago
2. Cambiar **Modo Producción** a **ON**
3. Actualizar las URLs a producción:
   - Niubiz: `https://apiprod.vnforapps.com`
   - Izipay: `https://api.micuentaweb.pe`
4. Guardar

---

## 📊 Cómo ver las Estadísticas (Admin General)

1. Ir al **Dashboard**
2. Click en el módulo: **"Estadísticas de Pagos"**
3. Ver el resumen:
   - 💰 Total procesado
   - ✅ Pagos aprobados
   - ⏳ Pagos pendientes
   - ❌ Pagos rechazados
4. Filtrar por rango de fechas (7 días, 30 días, etc.)
5. **Exportar CSV** para llevar a Excel

---

## 🔐 Seguridad y Consideraciones

### ✅ Seguridad Implementada:
- Las credenciales están en la base de datos (no en el código)
- Los padres solo ven sus propias transacciones
- Las pasarelas usan 3D Secure (verificación bancaria)
- SSL/HTTPS en todo el flujo

### ⚠️ Importante:
- **Nunca compartas las credenciales** de Niubiz/Izipay
- **Prueba primero en modo sandbox** antes de activar producción
- **Las comisiones las cobra la pasarela**, no nosotros
- **Los pagos son irreversibles** (solo se pueden hacer devoluciones manuales)

---

## 💰 Comisiones

| Pasarela | Por Transacción | Ejemplo (S/ 50) |
|----------|-----------------|-----------------|
| Niubiz   | 2.5% + S/ 0.30  | S/ 1.55         |
| Izipay   | 3.44% + S/ 0.50 | S/ 2.22         |

**¿Quién paga la comisión?**
- Puedes absorberla tú (el colegio)
- O pasarla al cliente (el padre paga S/ 52.22 en vez de S/ 50)

Actualmente, **la comisión está configurada como informativa** y no se cobra al padre automáticamente. Si quieres pasarla al cliente, dímelo y lo programo.

---

## 🛠️ Soporte Técnico

### Si un pago no se acredita:

1. **Verificar en Admin General > Estadísticas de Pagos**
   - ¿Aparece la transacción?
   - ¿Cuál es el estado? (pendiente/rechazado/aprobado)

2. **Si aparece como "Aprobado" pero el saldo no se actualizó:**
   - Ir a SuperAdmin > Database
   - Revisar tabla `payment_transactions`
   - Ver columna `recharge_applied` (debe ser `true`)
   - Si es `false`, ejecutar manualmente:
     ```sql
     UPDATE students
     SET balance = balance + MONTO
     WHERE id = 'STUDENT_ID';
     
     UPDATE payment_transactions
     SET recharge_applied = true
     WHERE id = 'TRANSACTION_ID';
     ```

3. **Si aparece como "Rechazado":**
   - El pago no pasó (tarjeta sin fondos, límite excedido, etc.)
   - El padre debe intentar de nuevo con otro método

4. **Si NO aparece:**
   - Revisar logs de la Edge Function (SuperAdmin > Database > Functions)
   - Puede ser un problema con el webhook de la pasarela

---

## 📞 Contactos Útiles

**Soporte Niubiz:**
- Teléfono: (01) 311-9898
- Email: soporte@niubiz.com.pe

**Soporte Izipay:**
- Teléfono: (01) 708-5000
- Email: soporte@izipay.pe

**Soporte de tu Sistema:**
- Programador: [Tu contacto aquí]

---

## 🎉 Beneficios para tu Negocio

✅ **Los padres recargan 24/7** (no necesitan venir al colegio)  
✅ **Menos manejo de efectivo** (todo digital y trazable)  
✅ **Reportes automáticos** (para contabilidad)  
✅ **Más ventas** (si el hijo tiene saldo, compra más)  
✅ **Imagen moderna** (tecnología de punta)  

---

**Versión:** 1.1.2  
**Fecha:** 10 de Enero, 2026  
**Estado:** ✅ IMPLEMENTADO (Requiere activación de pasarelas)

