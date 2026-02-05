# 🔍 DIAGNÓSTICO: Transacciones Duplicadas

## 📋 INSTRUCCIONES

### 1. Abrir Supabase SQL Editor

1. Ve a: https://supabase.com/dashboard (tu proyecto)
2. Clic en **"SQL Editor"**
3. Clic en **"New Query"**

### 2. Ejecutar el Script de Diagnóstico

Copia TODO el contenido del archivo:
```
supabase/migrations/DIAGNOSTICO_TRANSACCIONES_DUPLICADAS.sql
```

Y ejecútalo en Supabase (▶️ Run).

---

## 🔎 QUÉ VERÁS:

El script ejecuta **4 consultas**:

### **Consulta 1**: Transacciones del profesor "profesorjbl"
- Muestra las últimas 10 transacciones
- Verifica el `payment_status` de cada una
- ✅ **TODAS deberían estar como `paid`** después de pagar

### **Consulta 2**: Duplicados de almuerzos
- Busca si hay múltiples transacciones para el mismo almuerzo
- ⚠️ Si encuentras duplicados, necesitamos limpiarlos

### **Consulta 3**: Pedidos de almuerzo con múltiples transacciones
- Muestra pedidos que tienen MÁS DE 1 transacción asociada
- ⚠️ Cada pedido debería tener SOLO 1 transacción

### **Consulta 4**: Transacciones que aparecen en "¡Cobrar!"
- Muestra todas las transacciones `pending` o `partial`
- ✅ "profesorjbl" **NO debería aparecer** aquí si ya pagó

---

## 📸 ENVÍAME LOS RESULTADOS

Por favor, toma una captura de pantalla de los resultados de estas 4 consultas y envíamela.

Con eso podré:
1. Identificar si hay duplicados
2. Ver qué transacciones están mal
3. Crear un script de limpieza si es necesario

---

## 🚀 DESPUÉS DEL DIAGNÓSTICO

Una vez que vea los resultados, te daré:
1. Un script SQL para limpiar duplicados (si los hay)
2. Instrucciones para forzar la actualización del estado
3. Confirmación de que todo está correcto
