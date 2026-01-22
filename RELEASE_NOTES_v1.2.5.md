# 🚀 Release Notes - v1.2.5

**Fecha:** 22 de Enero de 2026  
**Tipo:** Bug Fix + Mejoras  

---

## 🐛 Correcciones Críticas

### **1. Fix RLS en Módulo de Padres**
- ✅ Corregidas políticas RLS en `parent_profiles`
- ✅ Admin General ahora puede ver todos los padres
- ✅ School Admin puede ver padres de su sede
- ✅ Padres pueden ver su propio perfil
- 📄 Scripts: `FIX_RLS_PARENT_PROFILES_V2.sql`

---

## 🆕 Nuevas Funcionalidades

### **2. Descripción en Productos**
- ✅ Campo `description` agregado a productos
- ✅ Textarea en formulario de creación/edición
- ✅ Se muestra en tarjetas del POS (2 líneas máx)
- ✅ Ayuda a justificar precios y explicar cualidades
- 📄 Script: `AGREGAR_COLUMNA_DESCRIPTION_PRODUCTS.sql`

### **3. Medios de Pago Mejorados en POS**
- ✅ **7 opciones de pago** para Cliente Genérico:
  - 💵 Efectivo
  - 📱 Yape (QR)
  - 📱 Yape (Número)
  - 📱 Plin (QR)
  - 📱 Plin (Número)
  - 💳 Tarjeta (Visa/Mastercard) - Preparado para Izipay
  - 🏦 Transferencia Bancaria
- ✅ Botones grandes y visuales
- ✅ Campos dinámicos según método seleccionado
- ✅ Toggle "¿Requiere Factura?"
- ✅ Código de operación para transferencias

### **4. Cambio de Nomenclatura**
- ✅ "Estudiante" → **"Crédito"** en selector POS
- Más claro para diferenciar tipos de venta

---

## 🔧 Mejoras Técnicas

### **Diagnóstico de Padres**
- ✅ Mejor logging en consola
- ✅ Mensajes de error descriptivos
- ✅ Estado vacío mejorado con botón de acción
- 📄 Script: `VERIFICAR_PADRES.sql`
- 📄 Guía: `DIAGNOSTICO_MODULO_PADRES.md`

### **Documentación**
- ✅ `RESUMEN_MEDIOS_PAGO_POS.md` - Guía completa de medios de pago
- ✅ `RESUMEN_DESCRIPCION_PRODUCTOS.md` - Sistema de descripciones

---

## 📋 Archivos SQL Creados

| Archivo | Descripción |
|---------|-------------|
| `FIX_RLS_PARENT_PROFILES_V2.sql` | Corrige políticas RLS de padres |
| `AGREGAR_COLUMNA_DESCRIPTION_PRODUCTS.sql` | Agrega descripción a productos |
| `VERIFICAR_PADRES.sql` | Diagnóstico de módulo de padres |

---

## 🔄 Instrucciones de Deploy

### **Para Producción:**

1. **SQL Scripts a Ejecutar en Supabase:**
   ```bash
   # 1. Corregir RLS de padres (CRÍTICO)
   FIX_RLS_PARENT_PROFILES_V2.sql
   
   # 2. Agregar descripción a productos (Opcional)
   AGREGAR_COLUMNA_DESCRIPTION_PRODUCTS.sql
   ```

2. **Verificar Deploy:**
   - ✅ Versión mostrada: **v1.2.5-beta**
   - ✅ Módulo de Padres muestra padres correctamente
   - ✅ POS muestra 7 medios de pago
   - ✅ Productos pueden tener descripción

---

## 🎯 Próximos Pasos (v1.3.0)

- [ ] Sistema de pedidos de almuerzos (ya implementado, pendiente release)
- [ ] Integración real con Izipay
- [ ] Mejoras en portal de padres

---

## 📝 Notas

- **Breaking Changes:** Ninguno
- **Requiere SQL:** ✅ Sí (RLS crítico)
- **Compatible con:** v1.2.x

---

**Deploy Status:** ✅ Completado  
**Git Commit:** `b4362ac`  
**Branch:** `main`
