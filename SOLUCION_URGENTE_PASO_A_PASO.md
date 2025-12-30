# 🚨 SOLUCIÓN URGENTE: PASO A PASO

---

## 🔍 PROBLEMAS DETECTADOS

### ❌ Problema 1: Base de datos incompleta
```
Error: column "school_id" does not exist
```

### ❌ Problema 2: Cambios no desplegados
Los fixes están en rama `feature` pero GitHub Pages muestra `main` (versión antigua).

---

## ✅ SOLUCIÓN (5 MINUTOS)

---

## PASO 1: ARREGLAR BASE DE DATOS (2 MIN)

### 1️⃣ **Abre Supabase SQL Editor**

Ve a: https://supabase.com/dashboard/project/duxqzozoahvrvqseinji/sql/new

### 2️⃣ **Copia y pega el contenido de este archivo:**

```
FIX_URGENTE_COLUMNA_SCHOOL_ID.sql
```

**IMPORTANTE:** Copia **TODO** el contenido del archivo (desde la primera línea hasta el final).

### 3️⃣ **Presiona "RUN"**

Deberías ver:

```
✅ Columna school_id agregada a profiles
✅ Columna pos_number agregada a profiles
✅ Columna ticket_prefix agregada a profiles

Y una tabla mostrando las 7 sedes con sus prefijos:
Nordic     | NRD  | FN
Saint George Villa | SGV | FSG
...
```

### 4️⃣ **Si ves algún error, cópialo y dímelo**

---

## PASO 2: DESPLEGAR CAMBIOS A PRODUCCIÓN (3 MIN)

Ahora vamos a hacer que GitHub Pages use la versión nueva con los fixes.

### 1️⃣ **En tu terminal, ejecuta:**

```bash
# Ir a la rama main
git checkout main

# Traer los cambios de feature
git merge feature/pestanas-dashboard-padres

# Subir a GitHub (esto activa el deploy automático)
git push origin main
```

### 2️⃣ **Espera 2-3 minutos**

GitHub Actions construirá y desplegará la nueva versión.

### 3️⃣ **Ve a GitHub Actions para ver el progreso:**

https://github.com/Rubennaldos/parent-portal-connect/actions

Cuando veas un ✅ verde, la nueva versión está lista.

---

## PASO 3: PROBAR (1 MIN)

### 1️⃣ **Limpia caché del navegador**

```
Ctrl + Shift + Del → Borrar todo
O simplemente Ctrl + Shift + R (recarga forzada)
```

### 2️⃣ **Entra de nuevo**

```
URL: https://rubennaldos.github.io/parent-portal-connect/
Email: superadmin@limacafe28.com
Tipo: Personal del Sistema
```

### 3️⃣ **Crea un cajero**

- Ve a "Perfiles por Sede"
- Selecciona Nordic
- Clic en "Agregar Perfil"
- Llena:
  ```
  Tipo: Punto de Venta (POS)
  Nombre: María López
  Email: maria.nordic@limacafe28.com
  Password: Test123456
  ```
- Clic en "Crear Usuario"

### 4️⃣ **Resultado esperado:**

```
✅ Usuario Creado
Cajero maria.nordic@limacafe28.com creado exitosamente con prefijo FN1

✅ SIGUES EN EL PANEL DE SUPERADMIN
✅ VES EL CAJERO EN LA LISTA
✅ NO TE SACA DEL SISTEMA
```

---

## 🆘 SI AÚN HAY PROBLEMAS

### Opción A: Trabajar en local

Si GitHub Pages sigue dando problemas, puedes trabajar en local:

```bash
# En tu terminal:
cd C:\Users\Alberto Naldos\Desktop\miproyecto\parent-portal-connect

# Instalar dependencias (si no lo has hecho)
npm install

# Ejecutar en local
npm run dev

# Abre: http://localhost:8080
```

Esto usará la versión con todos los fixes.

### Opción B: Esperar más tiempo

A veces GitHub Pages tarda hasta 10 minutos en actualizar.

---

## 📋 RESUMEN

```
1. ❌ BD incompleta → ✅ Ejecutar FIX_URGENTE_COLUMNA_SCHOOL_ID.sql
2. ❌ Cambios no desplegados → ✅ Merge a main + push
3. ✅ Probar creación de cajero
```

---

## 🤔 ¿POR QUÉ PASÓ ESTO?

### Problema de BD:
- No se ejecutó completamente `FASE1_BASE_DATOS_PERFILES.sql`
- Faltaban columnas: `school_id`, `pos_number`, `ticket_prefix`

### Problema de despliegue:
- Los fixes están en rama `feature`
- GitHub Pages despliega desde `main`
- Necesitamos hacer merge

---

## ✅ CHECKLIST

- [ ] Ejecuté `FIX_URGENTE_COLUMNA_SCHOOL_ID.sql` en Supabase
- [ ] Vi los mensajes de ✅ confirmación
- [ ] Hice `git checkout main`
- [ ] Hice `git merge feature/pestanas-dashboard-padres`
- [ ] Hice `git push origin main`
- [ ] Esperé 2-3 minutos
- [ ] Limpié caché del navegador
- [ ] Probé crear un cajero
- [ ] Funcionó correctamente ✅

---

## 📞 DIME CUANDO TERMINES PASO 1

Ejecuta primero el SQL en Supabase y dime:
- ¿Viste los mensajes de ✅?
- ¿Algún error?
- ¿Viste la tabla de sedes con prefijos?

Luego continuamos con el Paso 2 (merge a main).

---

**¡NO TE PREOCUPES, ES SOLO CONFIGURACIÓN DE BD!** 🚀

