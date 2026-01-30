# 🧪 PLAN DE TESTING COMPLETO - Producción v1.5.0

**Fecha**: Lunes 3 de Febrero, 2026  
**Objetivo**: Verificar que TODO funciona antes de que lleguen los padres

---

## 📋 **ORDEN DE CONFIGURACIÓN** (¿Qué hacer PRIMERO?)

### ✅ **PASO 0: REQUISITOS PREVIOS** (Hacer HOY, antes del lunes)

#### **Base de Datos - Verificar que existe:**
1. ✅ Al menos 1 sede creada en `schools`
2. ✅ Configuración de delay en `purchase_visibility_delay` (0 días para testing)
3. ✅ Permisos RLS activos

#### **Datos Maestros - Crear ANTES de usuarios:**
1. **Productos** (desde `/products`)
   - Mínimo 5 productos de prueba (galletas, jugos, snacks, etc.)
   - Asignar a la sede de testing
   - Activar todos

2. **Combos** (opcional, desde `/products` → pestaña Combos)
   - Crear 1-2 combos de prueba
   - Asignar a la sede de testing

3. **Menú de Almuerzos** (desde `/lunch-calendar`)
   - Crear menú para el LUNES (día de testing)
   - Entrada: Sopa de pollo
   - Segundo: Arroz con pollo
   - Bebida: Refresco natural
   - Precio: S/ 15.00

---

## 👥 **USUARIOS DE PRUEBA** (Crear en este orden)

### **1️⃣ ADMIN GENERAL** (Ya existe - tu cuenta)
```
Rol: admin_general
Email: [tu email actual]
Contraseña: [tu contraseña actual]
```
**Crear primero**: Sede, productos, menús

---

### **2️⃣ ADMINISTRADOR DE SEDE**
```
Rol: admin_sede
Email: admin.sede@limacafe28.com
Contraseña: Admin123!
Nombre: Juan Pérez
Sede: [Seleccionar sede de testing]
```
**Crear desde**: `/access-control` → Crear Usuario

**Permisos**: 
- Ver y gestionar calendario de almuerzos
- Ver pedidos de almuerzo
- Crear puentes temporales
- Entregar sin pedido previo

---

### **3️⃣ CAJERO**
```
Rol: operador_caja
Email: cajero1@limacafe28.com
Contraseña: Cajero123!
Nombre: María López
Sede: [Seleccionar sede de testing]
```
**Crear desde**: `/access-control` → Crear Usuario

**Permisos**:
- Acceso a POS
- Acceso a Lista de Ventas
- Acceso a Calendario de Almuerzos (para hacer pedidos)

---

### **4️⃣ PROFESOR** (Registrarse desde `/auth`)
```
Rol: teacher (se asigna automáticamente al registrarse)
Email: profesor1@limacafe28.com
Contraseña: Profe123!
Nombre: Carlos Martínez
DNI: 45678901
Área: Profesor
Sede: [Seleccionar sede de testing]
```
**Registrarse en**: `/auth` → Registrarse → Seleccionar "Profesor / Personal"

---

### **5️⃣ PADRE DE FAMILIA 1** (Registrarse desde `/auth`)
```
Rol: parent (se asigna automáticamente al registrarse)
Email: padre1@test.com
Contraseña: Padre123!

--- Datos del Primer Responsable ---
Nombre: Ana García
DNI: 12345678
Teléfono: 987654321
Dirección: Av. Test 123, Lima

--- Datos del Segundo Responsable ---
Nombre: Roberto García
DNI: 87654321
Teléfono: 987654322
Dirección: Av. Test 123, Lima
```
**Registrarse en**: `/auth` → Registrarse → Seleccionar "Padre de Familia"

---

### **6️⃣ PADRE DE FAMILIA 2** (Con hijo en Cuenta Crédito)
```
Rol: parent
Email: padre2@test.com
Contraseña: Padre123!

--- Datos del Primer Responsable ---
Nombre: Luis Fernández
DNI: 23456789
Teléfono: 987654323
Dirección: Av. Test 456, Lima

--- Datos del Segundo Responsable ---
Nombre: Carmen Fernández
DNI: 98765432
Teléfono: 987654324
Dirección: Av. Test 456, Lima
```

---

## 📱 **TESTING PASO A PASO** (LUNES por la mañana)

### ⏰ **7:00 AM - ANTES DE QUE LLEGUEN LOS PADRES**

#### **Admin General:**
1. ✅ Verificar que el menú del LUNES está creado
2. ✅ Verificar que los productos están activos
3. ✅ Verificar que los cajeros tienen acceso al POS

#### **Cajero:**
1. ✅ Hacer login en `/auth`
2. ✅ Entrar al POS (`/pos`)
3. ✅ Verificar que aparecen los productos
4. ✅ Hacer una venta de prueba (cliente genérico)
   - Agregar 2-3 productos al carrito
   - Seleccionar "Efectivo" como método de pago
   - Confirmar venta
   - Imprimir recibo
5. ✅ Verificar en `/sales` que aparece la venta

---

### 📱 **8:00 AM - TESTING MÓVIL (PADRE DE FAMILIA 1)**

#### **Dispositivo**: Celular (Chrome/Safari)

#### **PASO 1: Registro**
1. Abrir en celular: `https://[tu-dominio-vercel].vercel.app/auth`
2. Click en "Registrarse"
3. Seleccionar "Padre de Familia"
4. Ingresar email: `padre1@test.com`
5. Ingresar contraseña: `Padre123!`
6. Click "Crear Cuenta"
7. ✅ **VERIFICAR**: Sale modal de datos del padre

#### **PASO 2: Completar Datos del Padre**
1. **Primer Responsable:**
   - Nombre: Ana García
   - Tipo Doc: DNI
   - DNI: 12345678
   - Teléfono: 987654321
   - Dirección: Av. Test 123, Lima
   - Click "Siguiente"

2. **Segundo Responsable:**
   - Nombre: Roberto García
   - Tipo Doc: DNI
   - DNI: 87654321
   - Teléfono: 987654322
   - Click "Siguiente"

3. **Aceptar términos y condiciones**
   - Checkbox: Acepto términos
   - Click "Completar Registro"

4. ✅ **VERIFICAR**: Sale modal de onboarding de cuenta libre
5. Click "Entendido"

#### **PASO 3: Agregar Hijo**
1. ✅ **VERIFICAR**: Aparece pantalla con botón "Agregar Mi Primer Hijo"
2. Click en "Agregar Mi Primer Hijo"
3. **Datos del hijo:**
   - Nombre: Sofía García
   - Grado: 3er Grado
   - Sección: A
   - Sede: [Seleccionar sede de testing]
   - Límite diario: S/ 10.00
   - Límite semanal: S/ 50.00
   - Modo: **Cuenta Libre** (toggle activado)
4. Click "Guardar"
5. ✅ **VERIFICAR**: Aparece tarjeta del hijo con saldo S/ 0.00

#### **PASO 4: Subir Foto del Hijo**
1. Click en la imagen del estudiante (círculo gris)
2. ✅ **VERIFICAR**: Sale modal de consentimiento de fotos
3. Click "Acepto y continúo"
4. Seleccionar foto desde galería
5. Click "Subir Foto"
6. ✅ **VERIFICAR**: Foto se muestra en la tarjeta

#### **PASO 5: Ver Menú de Almuerzos**
1. Navegar a pestaña "Almuerzos" (ícono de tenedor abajo)
2. ✅ **VERIFICAR**: Aparece sección "Mis Pedidos de Almuerzo"
3. Scroll hacia abajo
4. ✅ **VERIFICAR**: Aparece calendario para hacer pedidos
5. ✅ **VERIFICAR**: Día LUNES tiene el menú (Sopa + Arroz con pollo + Refresco)

#### **PASO 6: Hacer Pedido de Almuerzo**
1. Click en el día LUNES
2. ✅ **VERIFICAR**: Se marca el día (color naranja)
3. Seleccionar hijo: Sofía García
4. Click "Confirmar Pedidos"
5. ✅ **VERIFICAR**: Modal de confirmación
   - Estudiante: Sofía García
   - Días: 1
   - Total: S/ 15.00
6. Click "Confirmar"
7. ✅ **VERIFICAR**: Toast verde "¡Pedidos registrados correctamente!"
8. ✅ **VERIFICAR**: Aparece en "Mis Pedidos de Almuerzo" con estado "Confirmado"

#### **PASO 7: Ver Tarjeta del Hijo (Balance)**
1. Navegar a pestaña "Mis Hijos" (ícono de casa abajo)
2. ✅ **VERIFICAR**: Balance de Sofía es **-S/ 15.00** (deuda por el almuerzo)
3. ✅ **VERIFICAR**: Aparece badge rojo con "Debe: S/ 15.00"

#### **PASO 8: Ver Pestaña Pagos**
1. Navegar a pestaña "Pagos" (ícono de billetera)
2. ✅ **VERIFICAR**: 
   - Balance total: **-S/ 15.00**
   - Tarjeta de Sofía con deuda de S/ 15.00
3. ✅ **VERIFICAR**: Historial muestra 1 transacción (Pedido de almuerzo)

---

### 📱 **8:30 AM - TESTING MÓVIL (PADRE DE FAMILIA 2 - PREPAGO)**

#### **PASO 1: Registro y Datos**
1. Registrarse como padre2@test.com
2. Completar datos de ambos responsables
3. Aceptar onboarding

#### **PASO 2: Agregar Hijo en Modo PREPAGO**
1. Agregar hijo: Diego Fernández
2. Grado: 4to Grado
3. Sección: B
4. **Modo: PREPAGO** (toggle desactivado)
5. Guardar

#### **PASO 3: Recargar Saldo**
1. ✅ **VERIFICAR**: Balance es S/ 0.00
2. Click en botón "Recargar"
3. ✅ **VERIFICAR**: Sale modal de recarga
4. Ingresar monto: S/ 50.00
5. Seleccionar método: Yape
6. Click "Confirmar Recarga"
7. ✅ **VERIFICAR**: Balance ahora es S/ 50.00

#### **PASO 4: Hacer Pedido de Almuerzo (Prepago)**
1. Navegar a "Almuerzos"
2. Click en día LUNES
3. Seleccionar hijo: Diego Fernández
4. Confirmar pedido
5. ✅ **VERIFICAR**: Balance ahora es S/ 35.00 (50 - 15)
6. ✅ **VERIFICAR**: NO hay deuda (porque pagó con saldo prepago)

---

### 💻 **9:00 AM - TESTING DESKTOP (ADMIN DE SEDE)**

#### **PASO 1: Login y Ver Pedidos**
1. Login como admin.sede@limacafe28.com
2. Entrar a "Calendario de Almuerzos"
3. Click en pestaña "Pedidos"
4. ✅ **VERIFICAR**: Aparecen 2 pedidos:
   - Sofía García - Estado: Confirmado - S/ 15.00
   - Diego Fernández - Estado: Confirmado - S/ 15.00

#### **PASO 2: Entregar Almuerzo**
1. Click en pedido de Sofía García
2. Click "Entregar"
3. ✅ **VERIFICAR**: Modal de confirmación
4. Click "Confirmar Entrega"
5. ✅ **VERIFICAR**: Estado cambia a "Entregado"

#### **PASO 3: Entregar sin Pedido Previo (Opción A)**
1. Click en botón "Entregar sin Pedido Previo"
2. Buscar estudiante: Sofía García
3. Seleccionar día: LUNES
4. Click "Confirmar Entrega"
5. ✅ **VERIFICAR**: Se crea una nueva transacción de deuda
6. ✅ **VERIFICAR**: El padre ve la deuda en su portal

#### **PASO 4: Crear Puente Temporal (Opción B)**
1. Click en botón "Crear Puente Temporal"
2. Ingresar datos:
   - Nombre: Estudiante Temporal 1
   - Aula: 5to B
   - Notas: Padre sin cuenta
3. Click "Crear"
4. ✅ **VERIFICAR**: Se crea el estudiante temporal
5. Hacer pedido de almuerzo para este estudiante
6. ✅ **VERIFICAR**: Se genera deuda automáticamente

---

### 🛒 **10:00 AM - TESTING POS (CAJERO)**

#### **PASO 1: Venta a Cliente Genérico**
1. Login como cajero1@limacafe28.com
2. Entrar al POS
3. Click "Cliente Genérico"
4. Agregar productos:
   - 2x Galletas (S/ 2.00 c/u)
   - 1x Jugo (S/ 3.00)
5. ✅ **VERIFICAR**: Total = S/ 7.00
6. Click "Proceder al Pago"
7. Seleccionar "Efectivo"
8. Click "Confirmar Venta"
9. ✅ **VERIFICAR**: Venta exitosa
10. Imprimir recibo (opcional)

#### **PASO 2: Venta a Estudiante (Cuenta Crédito)**
1. Click "Cuenta Crédito"
2. Buscar: Sofía García
3. Seleccionar
4. ✅ **VERIFICAR**: Se muestra info del estudiante
5. Agregar productos:
   - 1x Snack (S/ 3.50)
   - 1x Bebida (S/ 2.50)
6. ✅ **VERIFICAR**: Total = S/ 6.00
7. Click "Proceder al Pago"
8. ✅ **VERIFICAR**: NO sale modal de método de pago (es crédito)
9. ✅ **VERIFICAR**: Sale modal "Confirmar Compra a Crédito"
10. Click "Confirmar"
11. ✅ **VERIFICAR**: Venta exitosa

#### **PASO 3: Venta a Profesor**
1. Click "Profesor"
2. Buscar: Carlos Martínez
3. Seleccionar
4. Agregar productos:
   - 1x Almuerzo Combo (S/ 15.00)
5. Click "Proceder al Pago"
6. ✅ **VERIFICAR**: Se carga a cuenta libre del profesor
7. Confirmar
8. ✅ **VERIFICAR**: Venta exitosa

#### **PASO 4: Verificar Ventas**
1. Salir del POS
2. Entrar a "Lista de Ventas"
3. ✅ **VERIFICAR**: Aparecen las 3 ventas registradas
4. ✅ **VERIFICAR**: Total del día coincide

---

### 📱 **11:00 AM - TESTING MÓVIL (PROFESOR)**

#### **PASO 1: Login**
1. Login en celular como profesor1@limacafe28.com
2. ✅ **VERIFICAR**: Entra al Portal del Profesor

#### **PASO 2: Ver Historial**
1. Click en pestaña "Historial"
2. ✅ **VERIFICAR**: Aparece la compra del POS (S/ 15.00)

#### **PASO 3: Ver Pagos**
1. Click en pestaña "Pagos"
2. ✅ **VERIFICAR**: Balance: -S/ 15.00 (deuda)

#### **PASO 4: Pedir Almuerzo**
1. Click en pestaña "Menú"
2. ✅ **VERIFICAR**: Aparece calendario
3. Click en día MARTES
4. Confirmar pedido
5. ✅ **VERIFICAR**: Pedido registrado

---

### 📱 **12:00 PM - VERIFICACIÓN FINAL (PADRE 1)**

#### **Verificar Actualizaciones en Tiempo Real**
1. Login como padre1@test.com (celular)
2. Navegar a "Mis Hijos"
3. ✅ **VERIFICAR**: Balance de Sofía incluye:
   - Deuda de almuerzo del lunes: -S/ 15.00
   - Compra en POS: -S/ 6.00
   - Entrega sin pedido previo (si aplicó): -S/ 15.00
4. Navegar a "Almuerzos"
5. ✅ **VERIFICAR**: Pedido del lunes aparece como "Entregado"
6. Navegar a "Pagos"
7. ✅ **VERIFICAR**: Todas las transacciones aparecen

---

## ✅ **CHECKLIST FINAL DE VERIFICACIÓN**

### **Portal de Padres (Móvil)**
- [ ] Registro fluido (sin errores)
- [ ] Formulario de 2 responsables funciona
- [ ] Agregar hijo funciona
- [ ] Subir foto funciona
- [ ] Ver menú de almuerzos funciona
- [ ] Hacer pedido de almuerzo funciona
- [ ] Balance se actualiza correctamente
- [ ] Pestaña Pagos muestra deudas
- [ ] Recarga de saldo funciona (prepago)

### **Portal del Profesor (Móvil)**
- [ ] Login funciona
- [ ] Historial muestra compras
- [ ] Pagos muestra balance
- [ ] Calendario de almuerzos funciona
- [ ] Hacer pedido funciona

### **POS (Desktop)**
- [ ] Venta a cliente genérico funciona
- [ ] Venta a estudiante (crédito) funciona
- [ ] Venta a profesor funciona
- [ ] Skip método de pago para crédito funciona
- [ ] Búsqueda filtra por sede correctamente

### **Admin de Sede (Desktop)**
- [ ] Ver pedidos funciona
- [ ] Entregar pedido funciona
- [ ] Postergar/Anular funciona (antes 9 AM)
- [ ] Restricción horaria funciona (después 9 AM)
- [ ] Entregar sin pedido previo funciona
- [ ] Crear puente temporal funciona

### **Sistema General**
- [ ] RLS funciona (cada usuario ve solo lo suyo)
- [ ] Delay de compras funciona
- [ ] Versión v1.5.0 aparece en pantalla
- [ ] Sin errores en consola del navegador
- [ ] Responsive funciona en celular
- [ ] Navegación funciona correctamente

---

## 🚨 **ERRORES COMUNES A VERIFICAR**

### **En Móvil:**
1. ❌ **Error**: Botones muy pequeños → ✅ **Fix**: Ya están optimizados para touch
2. ❌ **Error**: Modales no cierran → ✅ **Fix**: Verificar que funcionan
3. ❌ **Error**: Scroll horizontal → ✅ **Fix**: Ya no debe haber

### **En Desktop:**
1. ❌ **Error**: 400 Bad Request en pedidos → ✅ **Fix**: Ya corregido
2. ❌ **Error**: Profesor sale 406 → ✅ **Fix**: Ya corregido con maybeSingle()

---

## 📞 **SI ENCUENTRAS ERRORES**

1. ❌ **Toma captura de pantalla**
2. 📝 **Anota qué estabas haciendo**
3. 🔍 **Revisa la consola del navegador (F12)**
4. 📨 **Envíame el error completo**

---

## ✅ **RESULTADO ESPERADO**

Al final del testing, debes tener:

1. ✅ 2 padres registrados con hijos
2. ✅ 1 profesor registrado
3. ✅ Al menos 3 ventas en POS
4. ✅ Al menos 3 pedidos de almuerzo
5. ✅ Deudas registradas correctamente
6. ✅ Sin errores en consola

---

**🎯 Si TODO funciona → Sistema LISTO para el LUNES 🎉**

**📱 Link para compartir a padres:**
```
https://[tu-dominio-vercel].vercel.app/auth
```

---

**Última actualización**: 29 de Enero, 2026  
**Versión**: 1.5.0
