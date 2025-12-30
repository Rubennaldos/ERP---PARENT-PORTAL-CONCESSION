# 📘 GUÍA VISUAL: CORRELATIVOS Y CREACIÓN DE CAJEROS

---

## 🎯 OBJETIVO

Entender cómo funcionan los correlativos y cómo crear cajeros con sus tickets únicos.

---

## 📋 PASO A PASO CON IMÁGENES

### **ESCENARIO INICIAL**

Tienes 7 sedes sin cajeros creados:
```
┌──────────────────────────────────────┐
│  Jean LeBouch                         │
│  ✨ Siguiente correlativo POS: JLB1  │
│  [Agregar Perfil]                     │
│                                       │
│  ❌ No hay cajeros asignados         │
└──────────────────────────────────────┘
```

---

### **PASO 1: CREAR PRIMER CAJERO**

1. Haz clic en **"Agregar Perfil"**
2. Llena el formulario:

```
┌─────────────────────────────────────────┐
│  CREAR USUARIO POS/KITCHEN              │
├─────────────────────────────────────────┤
│  Sede: Jean LeBouch                     │
│  Perfiles actuales: 0/3                 │
│  Prefijo base: JLB                      │
├─────────────────────────────────────────┤
│  Tipo de Perfil: [Punto de Venta (POS)]│
│  Nombre Completo: [María López        ] │
│  Email: [maria@limacafe28.com         ] │
│  Contraseña: [••••••••                ] │
├─────────────────────────────────────────┤
│              [Crear Usuario]             │
└─────────────────────────────────────────┘
```

3. Presiona **"Crear Usuario"**

---

### **PASO 2: SISTEMA ASIGNA AUTOMÁTICAMENTE**

El sistema ejecuta:

```javascript
// 1. Obtiene siguiente número
get_next_pos_number('jean-lebouch-id') → 1

// 2. Genera prefijo
generate_ticket_prefix('jean-lebouch-id', 1) → 'JLB1'

// 3. Crea secuencia de tickets
create_ticket_sequence('jean-lebouch-id', 'maria-user-id', 'JLB1')
  → JLB1-001, JLB1-002, JLB1-003...

// 4. Actualiza perfil
UPDATE profiles SET
  role = 'pos',
  school_id = 'jean-lebouch-id',
  pos_number = 1,
  ticket_prefix = 'JLB1'
WHERE id = 'maria-user-id';
```

---

### **PASO 3: AHORA SÍ APARECE EL CAJERO**

Después de crear, verás:

```
┌──────────────────────────────────────┐
│  Jean LeBouch                         │
│  ✨ Siguiente correlativo POS: JLB2  │
│  [Agregar Perfil]                     │
├──────────────────────────────────────┤
│  📦 Puntos de Venta (POS)            │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ maria@limacafe28.com           │  │
│  │ [JLB1] ✏️                      │  │  ← BOTÓN DE EDITAR
│  │                            ✅  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

### **PASO 4: EDITAR CORRELATIVO**

1. Haz clic en **✏️**

```
┌────────────────────────────────┐
│ maria@limacafe28.com           │
│ [JLB1 ]  ✓  ✕                │  ← Campo de texto editable
│                            ✅  │
└────────────────────────────────┘
```

2. Cambia el texto (ej: `JEAN1`)
3. Presiona **Enter** o clic en **✓**
4. Se actualiza en la base de datos:

```sql
UPDATE profiles 
SET ticket_prefix = 'JEAN1' 
WHERE id = 'maria-user-id';

UPDATE ticket_sequences 
SET prefix = 'JEAN1' 
WHERE pos_user_id = 'maria-user-id';
```

5. Ahora María generará tickets: `JEAN1-001`, `JEAN1-002`, etc.

---

## 🎯 CREAR MÚLTIPLES CAJEROS

### **Segundo Cajero**

Repites el proceso:

```
┌──────────────────────────────────────┐
│  Jean LeBouch                         │
│  ✨ Siguiente correlativo POS: JLB2  │  ← AHORA ES JLB2
│  [Agregar Perfil]                     │
├──────────────────────────────────────┤
│  📦 Puntos de Venta (POS)            │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ maria@limacafe28.com           │  │
│  │ [JLB1] ✏️                      │  │
│  │                            ✅  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ pedro@limacafe28.com           │  │
│  │ [JLB2] ✏️                      │  │  ← NUEVO CAJERO
│  │                            ✅  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

### **Tercer Cajero (LÍMITE MÁXIMO)**

```
┌──────────────────────────────────────┐
│  Jean LeBouch                         │
│  ✨ Siguiente correlativo POS: JLB3  │
│  [Agregar Perfil]                     │
├──────────────────────────────────────┤
│  📦 Puntos de Venta (POS)            │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ maria@limacafe28.com           │  │
│  │ [JLB1] ✏️                      │  │
│  │                            ✅  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ pedro@limacafe28.com           │  │
│  │ [JLB2] ✏️                      │  │
│  │                            ✅  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ luis@limacafe28.com            │  │
│  │ [JLB3] ✏️                      │  │
│  │                            ✅  │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  ⚠️ Límite máximo de 3 perfiles     │
└──────────────────────────────────────┘
```

---

## 📊 RESULTADO FINAL: CORRELATIVOS POR SEDE

### **Nordic**
```
Cajero 1: maria@nordic.com     → FN1-001, FN1-002, FN1-003...
Cajero 2: pedro@nordic.com     → FN2-001, FN2-002, FN2-003...
Cajero 3: luis@nordic.com      → FN3-001, FN3-002, FN3-003...
```

### **Saint George Villa**
```
Cajero 1: ana@sgv.com          → FSG1-001, FSG1-002, FSG1-003...
Cajero 2: jose@sgv.com         → FSG2-001, FSG2-002, FSG2-003...
```

### **Jean LeBouch**
```
Cajero 1: maria@jlb.com        → JLB1-001, JLB1-002, JLB1-003...
Cajero 2: pedro@jlb.com        → JLB2-001, JLB2-002, JLB2-003...
```

---

## 🎫 CUANDO UN CAJERO HACE UNA VENTA

María (JLB1) vende un sándwich:

```sql
-- 1. Se obtiene el siguiente número de ticket
SELECT get_next_ticket_number('maria-user-id');
-- Resultado: 'JLB1-045'

-- 2. Se registra la transacción
INSERT INTO transactions (
  student_id,
  type,
  amount,
  ticket_code,
  pos_user_id
) VALUES (
  'estudiante-id',
  'purchase',
  8.50,
  'JLB1-045',  ← CORRELATIVO ÚNICO
  'maria-user-id'
);

-- 3. Se incrementa el contador interno
UPDATE ticket_sequences
SET current_number = current_number + 1
WHERE pos_user_id = 'maria-user-id';
-- Próximo ticket será: JLB1-046
```

---

## ✅ RESUMEN

1. **CREAR CAJERO** → Se asigna automáticamente un correlativo (ej: `JLB1`)
2. **VER CAJERO** → Aparece el botón ✏️ para editar el prefijo
3. **EDITAR PREFIJO** → Cambia `JLB1` a cualquier otro (ej: `JEAN1`)
4. **USAR EN VENTAS** → Cada venta genera un ticket único (`JLB1-001`, `JLB1-002`...)

---

## 🔍 VERIFICACIÓN EN BASE DE DATOS

Puedes verificar que todo funciona correcto con estas queries:

```sql
-- Ver todos los cajeros con sus prefijos
SELECT 
  p.email,
  s.name AS sede,
  p.pos_number,
  p.ticket_prefix,
  ts.current_number AS ultimo_ticket
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
LEFT JOIN ticket_sequences ts ON ts.pos_user_id = p.id
WHERE p.role = 'pos'
ORDER BY s.name, p.pos_number;

-- Ver tickets generados
SELECT 
  t.ticket_code,
  p.email AS cajero,
  s.name AS sede,
  st.name AS estudiante,
  t.amount,
  t.created_at
FROM transactions t
JOIN profiles p ON p.id = t.pos_user_id
JOIN schools s ON s.id = p.school_id
JOIN students st ON st.id = t.student_id
WHERE t.ticket_code IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 50;
```

---

**¿Te quedó más claro el flujo completo?** 🚀

