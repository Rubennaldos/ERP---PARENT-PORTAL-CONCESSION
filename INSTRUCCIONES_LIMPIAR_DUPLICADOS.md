# 🧹 LIMPIAR TRANSACCIONES DUPLICADAS

## ⚠️ IMPORTANTE

Este script tiene 2 partes:
1. **DIAGNÓSTICO** (PASO 1, 2, 4, 5) - Solo consulta, no modifica nada
2. **LIMPIEZA** (PASO 3) - Elimina duplicados (viene comentado por seguridad)

---

## 📋 PASOS A SEGUIR

### 1. Ejecutar SOLO el Diagnóstico (PASOS 1, 2, 4, 5)

Copia el archivo `LIMPIAR_TRANSACCIONES_DUPLICADAS.sql` COMPLETO y ejecútalo en Supabase.

**El PASO 3 está comentado** (con `/* */`), así que NO se ejecutará automáticamente.

### 2. Ver los Resultados

Deberías ver:

**PASO 1 - Antes de Limpiar**:
```
momento              | full_name   | descripción              | cantidad_transacciones | monto_total
ANTES DE LIMPIAR     | profesorjbl | Almuerzo - 1 de febrero  | 4                      | 60.00
```

**PASO 2 - Identificar qué eliminar**:
```
id    | created_at           | payment_method  | operation_number | accion
xxxx  | 2026-02-02 00:00:00  | transferencia   | 1111             | ✅ MANTENER (más reciente)
xxxx  | 2026-02-02 00:00:00  | tarjeta         | NULL             | ❌ ELIMINAR (duplicado)
xxxx  | 2026-02-02 00:00:00  | yape            | NULL             | ❌ ELIMINAR (duplicado)
xxxx  | 2026-02-02 00:00:00  | transferencia   | NULL             | ❌ ELIMINAR (duplicado)
```

**PASO 5 - Transacciones pendientes de profesorjbl**:
- Debería salir VACÍO (0 filas)
- Si sale algo, necesitamos actualizarlo

### 3. Si TODO se ve bien, Ejecutar la Limpieza

**SOLO SI** el PASO 2 muestra correctamente qué va a eliminar:

1. Busca en el script el **PASO 3**
2. Elimina los `/*` y `*/` (descomenta el código)
3. Ejecuta SOLO esa parte
4. Debería eliminar las 3 transacciones duplicadas

### 4. Verificar

Después de ejecutar el PASO 3, deberías ver:

**PASO 4 - Después de Limpiar**:
```
momento              | full_name   | descripción              | cantidad_transacciones | monto_total
DESPUÉS DE LIMPIAR   | profesorjbl | Almuerzo - 1 de febrero  | 1                      | 15.00
```

---

## 🎯 RESULTADO ESPERADO

✅ Solo 1 transacción pagada para profesorjbl (la más reciente con operation_number 1111)  
✅ Las 3 duplicadas eliminadas  
✅ "profesorjbl" ya NO aparece en "¡Cobrar!"  
✅ Aparece solo 1 vez en "Pagos Realizados"

---

## 📸 ENVÍAME

Envíame capturas de los resultados de los PASOS 1, 2 y 5 antes de eliminar nada.
