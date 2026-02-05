# 🧹 LIMPIEZA GENERAL DE DUPLICADOS

## ⚠️ MUY IMPORTANTE
Este script limpiará TODOS los duplicados de almuerzos desde el 01/02/2026.

---

## 📋 QUÉ HACE:

### PASO 1: Diagnóstico
Muestra todos los casos donde hay duplicados

### PASO 2: Plan de Limpieza
Muestra exactamente qué se va a eliminar y qué se va a mantener

**Regla**: De cada grupo de duplicados, mantiene:
- ✅ El que está `paid` (si existe)
- ✅ Si hay varios `paid`, mantiene el más reciente
- ❌ Elimina todos los `pending`
- ❌ Elimina todos los `paid` antiguos

### PASO 3: Ejecutar Limpieza
**⚠️ ESTE PASO SÍ ELIMINA DATOS**

### PASO 4: Verificar Resultado
Muestra cuántas transacciones quedan por cliente

### PASO 5: Contar Pending Restantes
Debería ser 0 o muy pocos

---

## 🎯 RESULTADO ESPERADO:

✅ Solo 1 transacción por almuerzo por cliente  
✅ 0 transacciones `pending` si ya fueron pagadas  
✅ Todos desaparecen de "¡Cobrar!" después de pagar  
✅ Aparecen solo 1 vez en "Pagos Realizados"

---

## 📋 INSTRUCCIONES:

1. **Copia TODO el script** y ejecútalo en Supabase
2. **Revisa los resultados** del PASO 1 y 2
3. Si todo se ve bien, el **PASO 3 se ejecutará automáticamente**
4. **Recarga la página** de producción después (`Ctrl + Shift + R`)

---

## 📸 ENVÍAME:

Toma capturas de los resultados del PASO 1, 2, 4 y 5.
