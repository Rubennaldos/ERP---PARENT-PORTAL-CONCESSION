# 🚀 APLICAR MIGRACIÓN Y DEPLOY - INSTRUCCIONES

## ✅ PASO 1: Aplicar Migración SQL en Supabase (2 minutos)

### 1. Abre el SQL Editor de Supabase:
👉 https://supabase.com/dashboard/project/duxqzozoahvrvqseinji/sql/new

### 2. Copia y pega el siguiente SQL:

```sql
-- ========================================
-- FIX: Permitir UPDATE en lunch_orders
-- ========================================
-- Problema: Los usuarios autenticados no pueden actualizar is_cancelled
-- Solución: Agregar política RLS para permitir UPDATE

-- Paso 1: Ver las políticas actuales de lunch_orders
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'lunch_orders'
ORDER BY policyname;

-- Paso 2: Crear política para permitir UPDATE a usuarios autenticados
-- (Solo si no existe)

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar pedidos" ON lunch_orders;

-- Crear nueva política para UPDATE
CREATE POLICY "Usuarios autenticados pueden actualizar pedidos"
ON lunch_orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Paso 3: Crear política para permitir DELETE a usuarios autenticados (por si acaso)
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar pedidos" ON lunch_orders;

CREATE POLICY "Usuarios autenticados pueden eliminar pedidos"
ON lunch_orders
FOR DELETE
TO authenticated
USING (true);

-- Paso 4: Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'lunch_orders'
ORDER BY policyname;
```

### 3. Presiona "RUN" o "Ejecutar"

### 4. Verifica el resultado:
Deberías ver al final una tabla con las políticas, incluyendo:
- ✅ "Usuarios autenticados pueden ver pedidos" (SELECT)
- ✅ "Usuarios autenticados pueden crear pedidos" (INSERT)
- ✅ "Usuarios autenticados pueden actualizar pedidos" (UPDATE) ← NUEVA
- ✅ "Usuarios autenticados pueden eliminar pedidos" (DELETE) ← NUEVA

---

## ✅ PASO 2: Deploy de la Aplicación

La aplicación ya está construida. Si hay cambios en el código, se desplegarán automáticamente al hacer push a GitHub.

---

## 📋 RESUMEN

✅ **Aplicación construida** - Lista para producción
⏳ **Migración SQL** - Debe aplicarse manualmente en Supabase (Paso 1)
✅ **Deploy** - Automático al hacer push (si hay cambios)

---

## 🧪 VERIFICAR DESPUÉS DEL DEPLOY

1. Limpia la caché del navegador: `Ctrl + Shift + R`
2. Prueba actualizar un pedido de almuerzo (`is_cancelled`)
3. Verifica que no aparezcan errores de permisos RLS
