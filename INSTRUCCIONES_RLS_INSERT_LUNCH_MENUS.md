# 🔐 INSTRUCCIONES: Agregar Política RLS para INSERT en lunch_menus

## ❌ PROBLEMA
El cajero NO puede crear menús de almuerzo porque falta la política RLS de INSERT.

Error:
```
42501 - new row violates row-level security policy for table "lunch_menus"
```

---

## ✅ SOLUCIÓN

### PASO 1: Ir a Supabase
1. Abre: https://supabase.com/dashboard
2. Selecciona tu proyecto: **parent-portal-connect**
3. Ve a: **SQL Editor** (ícono de base de datos en el menú izquierdo)

### PASO 2: Ejecutar el SQL
1. Copia TODO el contenido del archivo: `supabase/migrations/FIX_LUNCH_MENUS_RLS_INSERT.sql`
2. Pégalo en el editor SQL
3. Presiona **RUN** o **Ctrl + Enter**

### PASO 3: Verificar Resultado
Deberías ver:
- ✅ Primera consulta: Muestra las políticas actuales
- ✅ Segunda consulta: Elimina política INSERT si existe (puede dar error si no existe, IGNÓRALO)
- ✅ Tercera consulta: `CREATE POLICY` (sin errores)
- ✅ Cuarta consulta: Muestra las políticas (SELECT, INSERT, UPDATE, DELETE)

---

## 🧪 PROBAR
1. Refresca el navegador (F5)
2. El cajero intenta crear un menú de almuerzo
3. Debería funcionar sin errores ✅

---

## 📝 NOTAS
- Ya deberías haber ejecutado el script anterior: `FIX_LUNCH_ORDERS_RLS_INSERT.sql`
- Este script es para la tabla `lunch_menus` (menús), el anterior era para `lunch_orders` (pedidos)
- Ambos son necesarios para que el cajero pueda crear menús Y pedidos
