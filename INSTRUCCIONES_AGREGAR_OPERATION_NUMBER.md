# 🔧 INSTRUCCIONES: Agregar columna operation_number

## ⚠️ ACCIÓN REQUERIDA

El sistema necesita una nueva columna en la tabla `transactions` para almacenar el número de operación de los pagos digitales (Yape, Plin, Transferencia, Tarjeta).

---

## 📋 PASOS PARA APLICAR LA MIGRACIÓN

### 1. Abrir Supabase SQL Editor

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New Query"**

### 2. Copiar y Pegar el Script

Copia TODO el contenido del archivo:
```
supabase/migrations/ADD_OPERATION_NUMBER_COLUMN.sql
```

Y pégalo en el editor SQL de Supabase.

### 3. Ejecutar el Script

1. Haz clic en el botón **"Run"** (▶️) o presiona `Ctrl + Enter`
2. Deberías ver un mensaje de éxito
3. El resultado mostrará la nueva columna creada:
   ```
   column_name       | data_type       | character_maximum_length | is_nullable
   operation_number  | character varying | 100                    | YES
   ```

### 4. Verificar

Ejecuta esta consulta para verificar:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'operation_number';
```

---

## ✅ ¿QUÉ HACE ESTE SCRIPT?

- ✅ Agrega la columna `operation_number` (VARCHAR 100)
- ✅ Permite valores NULL (opcional)
- ✅ Agrega un comentario de documentación
- ✅ Crea un índice para búsquedas rápidas
- ✅ Verifica que se creó correctamente

---

## 🚀 DESPUÉS DE EJECUTAR

Una vez ejecutado el script:
1. Recarga la aplicación en producción
2. Los pagos ahora guardarán el número de operación correctamente
3. Ya no verás el error "Could not find the 'operation_number' column"

---

## 📞 ¿PROBLEMAS?

Si tienes algún error, envíame una captura de pantalla del error en Supabase.
