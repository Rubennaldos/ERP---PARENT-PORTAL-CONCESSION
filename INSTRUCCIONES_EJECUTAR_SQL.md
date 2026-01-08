# 📋 Instrucciones para Ejecutar el SQL de Permisos

## ⚠️ IMPORTANTE: Debes ejecutar esto en Supabase

### Paso 1: Abrir Supabase SQL Editor
1. Ve a tu proyecto en Supabase
2. Click en "SQL Editor" en el menú lateral
3. Click en "New Query"

### Paso 2: Copiar y Ejecutar el SQL
1. Abre el archivo: `SISTEMA_PERMISOS_MODULOS_V2.sql`
2. Copia **TODO** el contenido (desde la línea 1 hasta la línea 248)
3. Pégalo en el SQL Editor de Supabase
4. Click en "Run" o presiona `Ctrl+Enter`

### Paso 3: Verificar que se ejecutó correctamente
Deberías ver al final:
```
✅ Permisos creados exitosamente | total_permisos: XX
✅ Permisos de roles configurados
```

### Paso 4: Verificar los permisos creados
Ejecuta este query para verificar:

```sql
-- Ver todos los permisos creados
SELECT 
  module,
  action,
  name,
  description
FROM permissions
ORDER BY module, action;

-- Ver permisos del rol gestor_unidad
SELECT 
  rp.role,
  p.module,
  p.action,
  p.name,
  rp.granted
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'gestor_unidad'
  AND rp.granted = true
ORDER BY p.module, p.action;
```

## 🔧 Si hay errores:

### Error: "relation permissions does not exist"
Necesitas crear las tablas primero. Ejecuta:
```sql
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);
```

Luego vuelve a ejecutar `SISTEMA_PERMISOS_MODULOS_V2.sql`

---

## ✅ Después de ejecutar el SQL:

1. **Recarga la página** del navegador (Ctrl+F5)
2. **Ve a Control de Acceso**
3. **Configura los permisos** para Gestor de Unidad
4. **Inicia sesión** como Gestor de Unidad
5. **Verifica** que solo vea los módulos permitidos



