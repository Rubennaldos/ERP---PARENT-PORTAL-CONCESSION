# 🧪 PRUEBA INMEDIATA: CREAR TU PRIMER CAJERO CON CORRELATIVO

---

## 🎯 OBJETIVO

Crear tu primer cajero y ver cómo funcionan los correlativos EN VIVO.

---

## ⏱️ TIEMPO ESTIMADO: 3 MINUTOS

---

## 📋 PASO A PASO (COPIA Y PEGA)

### **1️⃣ ENTRA AL SUPERADMIN**

1. Ve a: https://rubennaldos.github.io/parent-portal-connect/
2. Inicia sesión como SuperAdmin:
   - Email: `superadmin@limacafe28.com`
   - Tipo: **Personal del Sistema (Admin/POS/Kitchen)**

---

### **2️⃣ VE A "PERFILES POR SEDE"**

Haz clic en la pestaña: **"Perfiles por Sede"**

Verás las 7 sedes:
- Nordic
- Saint George Villa
- Saint George Miraflores
- Little Saint George
- Jean LeBouch
- Maristas Champagnat 1
- Maristas Champagnat 2

---

### **3️⃣ ELIGE UNA SEDE (EJ: JEAN LEBOUCH)**

Verás algo así:

```
┌───────────────────────────────────────┐
│  Jean LeBouch                          │
│  Código: JLB | Prefijo base: JLB       │
│  ✨ Siguiente correlativo POS: JLB1   │
│  [Agregar Perfil]              0/3     │
└───────────────────────────────────────┘
```

---

### **4️⃣ HAZ CLIC EN "AGREGAR PERFIL"**

Se abrirá un formulario modal.

---

### **5️⃣ LLENA EL FORMULARIO**

```
Tipo de Perfil: Punto de Venta (POS)
Nombre Completo: María López
Email: maria.jlb@limacafe28.com
Contraseña: Test123456
```

---

### **6️⃣ PRESIONA "CREAR USUARIO"**

Verás un mensaje de éxito:

```
✅ Usuario Creado
Cajero maria.jlb@limacafe28.com creado exitosamente con prefijo JLB1
```

---

### **7️⃣ ¡AHORA SÍ VERÁS EL CAJERO!**

```
┌───────────────────────────────────────┐
│  Jean LeBouch                          │
│  Código: JLB | Prefijo base: JLB       │
│  ✨ Siguiente correlativo POS: JLB2   │ ← CAMBIÓ A JLB2
│  [Agregar Perfil]              1/3     │ ← AHORA 1/3
├───────────────────────────────────────┤
│  📦 Puntos de Venta (POS)             │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │ maria.jlb@limacafe28.com        │  │
│  │ [JLB1] ✏️                       │  │ ← BOTÓN DE EDITAR
│  │                             ✅  │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

---

### **8️⃣ PRUEBA EDITAR EL CORRELATIVO**

1. Haz clic en el **lápiz ✏️**
2. El badge `JLB1` se convertirá en un campo de texto
3. Cámbialo a `JEAN1` (o lo que quieras)
4. Presiona **Enter**
5. Verás confirmación:

```
✅ Prefijo Actualizado
Cambiado de JLB1 a JEAN1
```

6. Ahora María generará tickets: `JEAN1-001`, `JEAN1-002`, etc.

---

### **9️⃣ CREA UN SEGUNDO CAJERO (OPCIONAL)**

Repite el proceso con:

```
Tipo de Perfil: Punto de Venta (POS)
Nombre Completo: Pedro Gómez
Email: pedro.jlb@limacafe28.com
Contraseña: Test123456
```

Ahora verás:

```
┌───────────────────────────────────────┐
│  📦 Puntos de Venta (POS)             │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │ maria.jlb@limacafe28.com        │  │
│  │ [JEAN1] ✏️                      │  │
│  │                             ✅  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ pedro.jlb@limacafe28.com        │  │
│  │ [JLB2] ✏️                       │  │ ← NUEVO CAJERO
│  │                             ✅  │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

---

## 🔍 VERIFICAR EN LA BASE DE DATOS

Ve a Supabase → SQL Editor y ejecuta:

```sql
-- Ver cajeros creados con sus correlativos
SELECT 
  p.email,
  s.name AS sede,
  s.code AS codigo_sede,
  p.pos_number AS numero_cajero,
  p.ticket_prefix AS prefijo_tickets,
  ts.current_number AS tickets_generados
FROM profiles p
JOIN schools s ON s.id = p.school_id
LEFT JOIN ticket_sequences ts ON ts.pos_user_id = p.id
WHERE p.role = 'pos'
ORDER BY s.name, p.pos_number;
```

**Resultado esperado:**

| email | sede | codigo_sede | numero_cajero | prefijo_tickets | tickets_generados |
|-------|------|-------------|---------------|-----------------|-------------------|
| maria.jlb@limacafe28.com | Jean LeBouch | JLB | 1 | JEAN1 | 0 |
| pedro.jlb@limacafe28.com | Jean LeBouch | JLB | 2 | JLB2 | 0 |

---

## 🎫 PRÓXIMO PASO: GENERAR TICKETS

Una vez que tengas cajeros creados, cuando uses el módulo POS:

```javascript
// En el módulo POS, al hacer una venta:
const { data: ticketCode } = await supabase
  .rpc('get_next_ticket_number', { p_user_id: cajeroId });

// Resultado: 'JEAN1-001'

// Se registra la transacción con ese código:
await supabase.from('transactions').insert({
  student_id: 'estudiante-id',
  type: 'purchase',
  amount: 8.50,
  ticket_code: 'JEAN1-001',
  pos_user_id: cajeroId
});

// Próximo ticket de María: 'JEAN1-002'
// Próximo ticket de Pedro: 'JLB2-001'
```

---

## ✅ CHECKLIST DE PRUEBA

- [ ] Entré al SuperAdmin
- [ ] Fui a "Perfiles por Sede"
- [ ] Vi el mensaje "✨ Siguiente correlativo POS: JLB1"
- [ ] Creé un cajero (María)
- [ ] Vi el cajero con su prefijo `[JLB1] ✏️`
- [ ] Hice clic en el lápiz y cambié el prefijo
- [ ] Vi la confirmación de actualización
- [ ] Creé un segundo cajero (Pedro) con prefijo `JLB2`
- [ ] Verifiqué en Supabase que los datos están correctos

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### **No veo el botón ✏️**
➡️ **Causa:** Aún no has creado cajeros.  
➡️ **Solución:** Crea al menos un cajero con "Agregar Perfil".

### **Error al crear cajero**
➡️ **Causa:** Falta ejecutar el SQL de Phase 1.  
➡️ **Solución:** Ejecuta `FASE1_BASE_DATOS_PERFILES.sql` en Supabase.

### **No aparece el correlativo sugerido**
➡️ **Causa:** Falta la tabla `school_prefixes`.  
➡️ **Solución:** Verifica que ejecutaste todo el SQL de Phase 1.

---

## 📞 SI TIENES DUDAS

Dime:
1. ¿En qué paso estás?
2. ¿Qué mensaje de error ves?
3. ¿Puedes compartir una captura de pantalla?

---

**¡EMPIEZA LA PRUEBA AHORA!** 🚀

