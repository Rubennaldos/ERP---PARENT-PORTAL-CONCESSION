# 🧠 PROMPT MAESTRO — Contexto Completo del Sistema

> **INSTRUCCIÓN**: Copia TODO este documento y pégalo como primer mensaje en cualquier chat nuevo con un AI (Claude, ChatGPT, Cursor, etc.) para que entienda tu sistema al 100%.

---

## PROMPT INICIO — COPIAR DESDE AQUÍ ↓

---

Eres mi asistente de desarrollo. Voy a darte el contexto completo de mi sistema para que puedas ayudarme con cualquier tarea. Siempre responde en español.

## 1. RESUMEN DEL PROYECTO

**Nombre**: Parent Portal Connect (Portal de Padres / Sistema de Gestión de Concesionarias de Alimentos Escolares)

**Versión actual**: v1.22.0

**Qué hace**: Sistema integral para concesionarias de alimentos que operan dentro de colegios en Perú. Permite gestionar:
- Punto de Venta (POS) con tickets térmicos
- Pedidos y menús de almuerzo (por categoría, con addons)
- Gestión de saldos/billeteras de estudiantes
- Portal para padres (ver consumos, recargar saldo, pedir almuerzos, pagar deudas con voucher)
- Portal para profesores (ver consumos, pedir almuerzos)
- Sistema de cobranzas (deudas pendientes, aprobación de vouchers)
- Caja registradora (apertura, movimientos, cierre, reportes)
- Gestión de productos con precios diferenciados por sede
- Control de acceso por roles y permisos dinámicos
- Facturación electrónica (Nubefact/SUNAT)
- Logística y almacén (pedidos entre sedes)
- Reportes y dashboards

**Estado**: En PRODUCCIÓN desde enero 2026, con ~7 sedes escolares activas. Clases inician en 5 días (25 feb 2026).

## 2. STACK TECNOLÓGICO

### Frontend
- **React 18** + **TypeScript**
- **Vite 5** (bundler)
- **React Router DOM 6** (routing)
- **Tailwind CSS 3** + **shadcn/ui** (componentes UI basados en Radix)
- **TanStack React Query** (cache/fetching)
- **Zustand** (estado global, poco uso)
- **Recharts** (gráficos)
- **date-fns** (fechas)
- **jsPDF + jspdf-autotable** (generación de PDFs)
- **xlsx** (exportar Excel)
- **QZ Tray** (impresión térmica de tickets POS)
- **Lucide React** (iconos)
- **Sonner** + Toast de Radix (notificaciones)
- **React Hook Form + Zod** (formularios y validación)

### Backend
- **Supabase** (BaaS):
  - PostgreSQL (base de datos)
  - Auth (autenticación con email/password)
  - Storage (archivos: vouchers, fotos)
  - Row Level Security (RLS) para aislamiento de datos
  - RPC Functions (funciones PostgreSQL custom)
  - Edge Functions (webhooks, integraciones)
- **No hay backend Node/Express** — todo el backend es Supabase

### Deploy
- **Vercel** (hosting del frontend SPA)
- **GitHub** (repositorio: `rubennaldos/parent-portal-connect`)
- **GitHub Actions** (CI/CD alternativo a Vercel)

### Herramientas de desarrollo
- **Cursor IDE** (editor con AI)
- **lovable-tagger** (plugin de Lovable.dev, donde se inició el proyecto)
- **mkcert** (certificados SSL para desarrollo local — necesario para QZ Tray)

## 3. ESTRUCTURA DEL PROYECTO

```
parent-portal-connect/
├── public/                     # Assets estáticos
├── src/
│   ├── App.tsx                 # Router principal con todas las rutas
│   ├── main.tsx                # Entry point
│   ├── index.css               # Estilos globales Tailwind
│   │
│   ├── config/
│   │   └── supabase.config.ts  # Config de Supabase (URL + anon key)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Provider de autenticación (signIn, signUp, signOut)
│   │
│   ├── hooks/
│   │   ├── useRole.ts          # Hook para obtener rol del usuario (superadmin, admin_general, etc.)
│   │   ├── usePermissions.ts   # Hook para permisos dinámicos por módulo
│   │   ├── useUserProfile.ts   # Hook para datos del perfil (nombre, school_id)
│   │   ├── useCashRegisterGuard.ts # Verifica si hay caja abierta
│   │   ├── useOnboardingCheck.ts   # Verifica si el padre completó onboarding
│   │   ├── useErrorLogger.ts   # Logger de errores
│   │   ├── use-mobile.tsx      # Detecta si es móvil
│   │   └── use-toast.ts        # Hook de toast notifications
│   │
│   ├── lib/
│   │   ├── supabase.ts         # Cliente Supabase (createClient)
│   │   ├── productPricing.ts   # Lógica de precios por sede (getProductsForSchool)
│   │   ├── posPrinterService.ts # Servicio de impresión térmica (QZ Tray)
│   │   ├── htmlPrinterService.ts # Impresión por navegador
│   │   ├── printerService.ts   # Abstracción de impresión
│   │   ├── nubefact.ts         # Integración facturación electrónica
│   │   ├── sunat.ts            # Validación RUC/DNI SUNAT
│   │   ├── qzConfig.ts         # Configuración QZ Tray
│   │   ├── qzSigning.ts        # Firma digital QZ Tray
│   │   └── utils.ts            # Utilidades (cn para clases)
│   │
│   ├── types/
│   │   └── cashRegister.ts     # Tipos de caja registradora
│   │
│   ├── pages/                  # Páginas principales (una por módulo)
│   │   ├── Index.tsx           # Portal de padres (home)
│   │   ├── Auth.tsx            # Login/Registro unificado
│   │   ├── Dashboard.tsx       # Dashboard de módulos (staff)
│   │   ├── POS.tsx             # Punto de Venta (~2800 líneas)
│   │   ├── Products.tsx        # Gestión de productos
│   │   ├── LunchOrders.tsx     # Pedidos de almuerzo (~2500 líneas)
│   │   ├── LunchCalendar.tsx   # Calendario de menús
│   │   ├── Comedor.tsx         # Pantalla de comedor (entrega)
│   │   ├── Cobranzas.tsx       # Módulo de cobranzas (tabs: Pagos, Recargas, etc.)
│   │   ├── Finanzas.tsx        # Tesorería
│   │   ├── CashRegister.tsx    # Caja registradora
│   │   ├── SalesList.tsx       # Lista de ventas
│   │   ├── ParentConfiguration.tsx # Config de padres/profesores/estudiantes
│   │   ├── Admin.tsx           # Panel admin legacy
│   │   ├── SuperAdmin.tsx      # Panel superadmin (programador)
│   │   ├── Teacher.tsx         # Portal de profesores
│   │   ├── AccessControl.tsx   # Control de acceso/permisos
│   │   ├── SchoolAdmin.tsx     # Admin de sede
│   │   ├── Logistics.tsx       # Logística/almacén
│   │   ├── CombosPromotions.tsx # Combos y promociones
│   │   └── PaymentStats.tsx    # Estadísticas de pagos
│   │
│   └── components/             # Componentes organizados por módulo
│       ├── admin/              # Gestión de usuarios, padres, estudiantes, impresoras
│       ├── billing/            # Cobranzas, config billing, voucher approval, reportes
│       ├── cash-register/      # Apertura, cierre, movimientos de caja
│       ├── lunch/              # Wizard de pedidos, calendario, categorías, addons
│       ├── parent/             # Componentes del portal de padres
│       ├── teacher/            # Componentes del portal de profesores
│       ├── products/           # Matriz de precios, bulk upload, combos
│       ├── pos/                # Ticket térmico
│       ├── sales/              # Dashboard de ventas, config visibilidad
│       ├── school-admin/       # Gestión de grados/secciones, pedidos logística
│       ├── logistics/          # Procesamiento de pedidos
│       └── ui/                 # ~50 componentes shadcn/ui (Button, Dialog, Select, etc.)
│
├── supabase/
│   └── migrations/             # ~200+ archivos SQL de migraciones
│
├── vercel.json                 # Config de Vercel (SPA rewrite)
├── vite.config.ts              # Config de Vite
├── tailwind.config.ts          # Config de Tailwind
├── tsconfig.json               # Config de TypeScript
└── package.json                # Dependencias (v1.22.0)
```

## 4. BASE DE DATOS — TABLAS PRINCIPALES

### Tablas Core
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `schools` | Sedes/colegios | id, name, code, warehouse_id, is_active |
| `profiles` | Usuarios del sistema | id (=auth.users.id), email, full_name, role, school_id, custom_schools[] |
| `students` | Estudiantes | id, full_name, parent_id, school_id, balance, grade, section, photo_url, free_account, limit_type, daily_limit, weekly_limit, monthly_limit, level_id, classroom_id |
| `parent_profiles` | Datos del padre | id, user_id, school_id, full_name, dni, phone_1, phone_2, onboarding_completed |
| `teacher_profiles` | Profesores | id, user_id, full_name, school_id_1, school_id_2, balance, free_account |

### Tablas de Transacciones/Ventas
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `transactions` | Todas las transacciones | id, student_id, teacher_id, type ('purchase'/'recharge'), amount, description, payment_method, payment_status ('paid'/'pending'/'partial'/'cancelled'), school_id, ticket_code, metadata (JSONB), manual_client_name, created_by |
| `transaction_items` | Items de cada venta | id, transaction_id, product_id, product_name, quantity, unit_price, subtotal |

### Tablas de Productos
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `products` | Catálogo de productos | id, name, category, price, school_ids (UUID[]), image_url, is_available, active |
| `product_school_prices` | Precios por sede | id, product_id, school_id, price_sale, price_cost, is_available |

### Tablas de Almuerzo
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `lunch_categories` | Categorías (Menú del día, Dieta, etc.) | id, school_id, name, price, is_active |
| `lunch_menus` | Menús diarios | id, school_id, date, category_id, main_course, side_dish, dessert, drink, target_type |
| `lunch_orders` | Pedidos de almuerzo | id, student_id, teacher_id, manual_name, school_id, order_date, category_id, quantity, base_price, final_price, payment_method, status, is_cancelled |
| `lunch_addons` | Complementos (extra arroz, etc.) | id, school_id, name, price, is_active |

### Tablas de Cobranzas/Pagos
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `billing_config` | Config de cobros por sede | id, school_id, yape_number, plin_number, bank_info, bank_name, bank_account_number |
| `billing_periods` | Períodos de facturación | id, school_id, start_date, end_date, status |
| `recharge_requests` | Solicitudes de recarga/pago | id, parent_id, student_id, amount, payment_method, reference_code, voucher_url, status, request_type ('recharge'/'lunch_payment'/'debt_payment'), description, lunch_order_ids (UUID[]), paid_transaction_ids (UUID[]) |

### Tablas de Caja
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `cash_registers` | Registros de caja | id, school_id, opened_by, status ('open'/'closed'), opening_amount, closing_amount |
| `cash_movements` | Movimientos | id, register_id, type ('income'/'expense'), amount, description |

### Tablas de Permisos
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `modules` | Módulos del sistema | id, code, name, icon, path |
| `role_permissions` | Permisos por rol | id, role, module_id, can_access |

### Tablas de Estructura Escolar
| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `school_levels` | Grados/niveles por sede | id, school_id, name, order_index |
| `school_classrooms` | Aulas/secciones | id, school_id, level_id, name |

## 5. SISTEMA DE ROLES

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Programador (hardcodeado por email) | TODO el sistema, panel técnico |
| `admin_general` | Dueño/gerente de la concesionaria | Todas las sedes, todos los módulos |
| `supervisor_red` | Supervisor de red de sedes | Ver todas las sedes, reportes |
| `gestor_unidad` | Encargado de una sede | Solo SU sede, gestión completa |
| `operador_caja` | Cajero/a | Solo SU sede: POS, caja, ventas |
| `operador_cocina` | Personal de cocina | Solo SU sede: comedor, pedidos |
| `parent` | Padre de familia | Portal de padres: ver consumos, recargar, pedir almuerzos |
| `teacher` | Profesor | Portal de profesores: ver consumos, pedir almuerzos |

### Detección de rol
```typescript
// src/hooks/useRole.ts
// Superadmin detectado por email hardcodeado:
if (user.email === 'superadmin@limacafe28.com') {
  setRole('superadmin');
}
// Demás roles: consultados de profiles.role
```

### Permisos dinámicos
```typescript
// src/hooks/usePermissions.ts
// Consulta role_permissions + modules para determinar qué módulos puede ver cada rol
// Se usa con <PermissionProtectedRoute moduleCode="pos">
```

## 6. RUTAS DE LA APLICACIÓN

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/auth` | Auth.tsx | Público (login/registro) |
| `/` | Index.tsx | Parent |
| `/teacher` | Teacher.tsx | Teacher |
| `/superadmin` | SuperAdmin.tsx | Superadmin |
| `/dashboard` | Dashboard.tsx | Staff (admin, gestor, operador) |
| `/admin` | Admin.tsx | Admin General |
| `/pos` | POS.tsx | Permiso: `pos` |
| `/sales` | SalesList.tsx | Permiso: `ventas` |
| `/cobranzas` | Cobranzas.tsx | Permiso: `cobranzas` |
| `/finanzas` | Finanzas.tsx | Admin General |
| `/comedor` | Comedor.tsx | Permiso: `comedor` |
| `/parents` | ParentConfiguration.tsx | Permiso: `config_padres` |
| `/products` | Products.tsx | Permiso: `productos` |
| `/lunch-calendar` | LunchCalendar.tsx | Permiso: `almuerzos` |
| `/cash-register` | CashRegister.tsx | Permiso: `cash_register` |
| `/logistics` | Logistics.tsx | Permiso: `logistica` |
| `/school-admin` | SchoolAdmin.tsx | Permiso: `admin_sede` |
| `/access-control` | AccessControl.tsx | Admin General |
| `/combos-promotions` | CombosPromotions.tsx | Permiso: `promociones` |
| `/payment-stats` | PaymentStats.tsx | Admin General |

## 7. LÓGICA DE NEGOCIO CLAVE

### Flujo de Venta en POS
1. Cajero busca estudiante/profesor por nombre
2. Selecciona productos del catálogo (filtrado por sede)
3. Elige método de pago: saldo, efectivo, yape, plin, transferencia, crédito (fiado)
4. Si es crédito → `payment_status = 'pending'` (genera deuda)
5. Se genera ticket con `ticket_code` (formato: `SEDE-NNNNNN`)
6. Se registra `transaction` + `transaction_items`
7. Si pago con saldo → se descuenta de `students.balance`

### Flujo de Pedido de Almuerzo
1. Admin/padre selecciona estudiante/profesor
2. Elige fecha → ve menús disponibles por categoría
3. Selecciona categoría → ve el menú del día
4. Confirma cantidad
5. Se crea `lunch_order` + `transaction` asociada
6. Si ya existe pedido de la misma categoría → se ACTUALIZA la cantidad (upsert)
7. Padre puede pagar con voucher → `recharge_requests` con `request_type = 'lunch_payment'`

### Flujo de Pagos por Voucher
1. Padre ve deuda en pestaña "Pagos"
2. Click "Pagar deuda" → abre `RechargeModal` con `requestType = 'debt_payment'`
3. Padre sube foto del voucher + número de operación
4. Se crea `recharge_request` con `paid_transaction_ids`
5. Admin ve en módulo Cobranzas → pestaña "Pagos" → `VoucherApproval`
6. Admin aprueba → transacciones pasan a `payment_status = 'paid'`
7. Admin rechaza → padre puede reenviar otro comprobante

### Precios por Sede
```typescript
// src/lib/productPricing.ts - getProductsForSchool(schoolId)
// 1. Busca productos donde school_ids contiene el schoolId, o school_ids es vacío, o school_ids es null
// 2. Busca precios específicos en product_school_prices
// 3. Si hay precio por sede → usa ese; si no → usa price base del producto
```

### Ticket Code
```sql
-- RPC: get_next_ticket_number(p_school_id UUID)
-- Genera códigos secuenciales por sede: SEDE-000001, SEDE-000002, etc.
-- Almacenado en ticket_sequences(school_id, last_number)
```

## 8. CONFIGURACIÓN DE SUPABASE

```typescript
// src/config/supabase.config.ts
// Detecta entorno automáticamente (localhost = DEV, producción = PROD)
// PROD_CONFIG apunta a: https://duxqzozoahvrvqseinji.supabase.co

// src/lib/supabase.ts
// Crea el cliente con createClient(url, anonKey)
// Exporta: supabase (SupabaseClient) e isAuthConfigured (boolean)
```

### RLS (Row Level Security)
- **TODAS las tablas principales** tienen RLS habilitado
- Patrón: `admin_general` ve TODO, `gestor_unidad` solo SU sede (via `profiles.school_id`), `parent` solo SUS hijos, `teacher` solo SUS transacciones
- Storage: bucket `vouchers` con políticas por usuario

## 9. SEDES ACTUALES (PRODUCCIÓN)

| Sede | school_id | Tipo |
|------|-----------|------|
| Nordic | ba6219dd-05ce-43a4-b91b-47ca94744f97 | Colegio |
| St. George's Villa | 697243fe-f2d2-4fb4-a277-d43cb62ae861 | Colegio |
| St. George's Miraflores | 2a50533d-7fc1-4096-80a7-e20a41bda5a0 | Colegio |
| Maristas Champagnat 1 | 9963c14c-22ff-4fcb-b5cc-599596896daa | Colegio |
| Maristas Champagnat 2 | 7d6ca0e8-f68c-422e-89e8-35a21d673185 | Colegio |
| Jean LeBouch | 8a0dbd73-0571-4db1-af5c-65f4948c4c98 | Colegio |
| Little St. George's | 14eafb90-824b-4498-b0dd-1e9d0fe26795 | Colegio |

## 10. BUGS CONOCIDOS Y PATRONES DE ERROR RECURRENTES

### Problemas resueltos (pero pueden repetirse en nuevas features)
1. **Timezone en fechas**: Usar `new Date(dateString + 'T00:00:00')` para evitar que una fecha se muestre como el día anterior
2. **Columna ambigua en RPC**: Variables PL/pgSQL deben tener prefijo `v_` para no colisionar con columnas
3. **Upload a Storage**: Sanitizar nombres de archivo (sin espacios ni caracteres especiales)
4. **school_ids NULL en productos**: Filtros deben incluir `.is.null` para productos legacy
5. **FK constraints huérfanas**: Al recrear tablas (ej: `lunch_categories`), verificar que no queden registros con `category_id` apuntando a categorías eliminadas
6. **Unique constraints**: Al hacer upsert de pedidos, verificar constraints como `lunch_orders_student_id_order_date_key` — que puede ser demasiado restrictiva
7. **PostgREST resource embedding**: Si faltan FK constraints, los JOINs de Supabase (`select('*, tabla(campos)')`) fallan con PGRST200
8. **RLS demasiado restrictiva**: Si un `INSERT` falla silenciosamente, probablemente falta una política de INSERT/UPDATE

### Patrón de debug
1. Verificar error exacto en la consola del navegador (F12)
2. Si es error de Supabase → revisar RLS policies y estructura de tabla
3. Si es PGRST200 → verificar foreign keys
4. Si es "duplicate key" → revisar unique constraints
5. Si datos no aparecen → verificar RLS SELECT policies del rol actual

## 11. ARCHIVOS MÁS GRANDES Y COMPLEJOS (>500 líneas)

| Archivo | Líneas aprox. | Descripción |
|---------|--------------|-------------|
| `src/pages/POS.tsx` | ~2800 | Punto de Venta completo |
| `src/pages/LunchOrders.tsx` | ~2500 | Gestión de pedidos de almuerzo |
| `src/components/billing/BillingCollection.tsx` | ~3000 | Módulo de cobranzas |
| `src/pages/ParentConfiguration.tsx` | ~1700 | Config padres/profesores/estudiantes |
| `src/components/admin/SalesList.tsx` | ~1400 | Lista de ventas |
| `src/components/lunch/PhysicalOrderWizard.tsx` | ~1200 | Wizard de pedidos presenciales |
| `src/components/billing/BillingConfig.tsx` | ~870 | Config de facturación |
| `src/pages/Index.tsx` | ~800 | Portal de padres (home) |

## 12. VARIABLES DE ENTORNO

```env
# .env (desarrollo local)
VITE_SUPABASE_URL=https://duxqzozoahvrvqseinji.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

# Opcionales (para entorno DEV separado)
VITE_SUPABASE_URL_DEV=https://TU-PROYECTO-DEV.supabase.co
VITE_SUPABASE_ANON_KEY_DEV=tu_anon_key_dev
```

## 13. COMANDOS ÚTILES

```bash
# Desarrollo local
npm run dev                    # Inicia en https://localhost:8080

# Build
npm run build                  # Build para producción
npm run build:dev              # Build con modo development

# Deploy
git add . && git commit -m "feat: ..." && git push origin main
# Vercel detecta el push y despliega automáticamente

# Preview del build
npm run preview
```

## 14. MIGRACIONES SQL — ORDEN DE EJECUCIÓN PARA NUEVO PROYECTO

Si necesitas recrear la base de datos desde cero en un nuevo proyecto Supabase, ejecuta estos SQL en el SQL Editor en este orden:

### Fase 1: Tablas Base
```
1. SETUP_POS_TABLES.sql (students, products, transactions, transaction_items)
2. SISTEMA_REGISTRO_PADRES_DB.sql (schools, parent_profiles, student_relationships, allergies)
3. CREATE_TEACHER_PROFILES_TABLE.sql (teacher_profiles)
4. FIX_TRANSACTIONS_SCHOOL_RELATION.sql (school_id en transactions)
```

### Fase 2: Sistemas Complementarios
```
5. SETUP_PRECIOS_POR_SEDE.sql (product_school_prices)
6. SETUP_GRADOS_SALONES_PERSONALIZABLES.sql (school_levels, school_classrooms)
7. CREATE_LUNCH_CATEGORIES_SYSTEM.sql (lunch_categories, lunch_menus)
8. CREATE_LUNCH_ADDONS_SYSTEM.sql (lunch_addons)
9. SETUP_LUNCH_ORDERS_SYSTEM.sql (lunch_orders)
10. CREATE_CASH_REGISTER_SYSTEM.sql (cash_registers, cash_movements)
11. CREATE_RECHARGE_REQUESTS.sql (recharge_requests)
12. CREATE_PERMISSIONS_SYSTEM.sql (modules, role_permissions)
13. INSERT_ALL_MODULES.sql (datos de módulos)
14. SETUP_FACTURACION_ELECTRONICA.sql (billing_config, nubefact_config)
15. SETUP_STORAGE_BUCKET.sql (bucket para vouchers)
```

### Fase 3: Campos Adicionales
```
16. ADD_PAYMENT_TYPE_TO_RECHARGE_REQUESTS.sql (request_type, description, lunch_order_ids)
17. ADD_PAID_TRANSACTION_IDS_TO_RECHARGE_REQUESTS.sql (paid_transaction_ids)
18. ADD_QUANTITY_TO_LUNCH_ORDERS.sql (quantity en lunch_orders)
19. ADD_SCHOOL_ID_TO_LUNCH_ORDERS.sql (school_id en lunch_orders)
20. ADD_FINANCIAL_FIELDS_TO_TEACHER_PROFILES.sql (balance, free_account en teachers)
21. ADD_MANUAL_CLIENT_NAME_TO_TRANSACTIONS.sql (manual_client_name)
22. ADD_PAYMENT_METHOD_FIELDS.sql (payment_method, payment_status, ticket_code)
23. ADD_MIXED_PAYMENT_COLUMNS.sql (campos para pagos mixtos)
24. ADD_CANCELLATION_FIELDS_TO_LUNCH_ORDERS.sql (is_cancelled, cancelled_at, etc.)
```

### Fase 4: RLS Policies
```
25. RECREATE_ALL_TRANSACTIONS_RLS_POLICIES.sql
26. FIX_LUNCH_MENUS_RLS_BY_SCHOOL.sql
27. CREATE_ALL_CASH_RLS_POLICIES.sql
28. FIX_PRODUCT_SCHOOL_PRICES_RLS.sql
29. FIX_STORAGE_POLICIES.sql
30. ADD_OPERADOR_CAJA_RLS_POLICY.sql
```

### Fase 5: Funciones RPC
```
31. FIX_CHECK_STUDENT_SPENDING_LIMIT.sql (límites de gasto)
32. CREATE_VALIDATE_ADMIN_PASSWORD.sql (validación de contraseña admin)
33. FIX_BACKFILL_TICKET_CODES.sql (generador de ticket codes)
```

### Fase 6: Fixes Recientes
```
34. FIX_LUNCH_ORDERS_UNIQUE_CONSTRAINT.sql
35. FIX_LUNCH_MENUS_CATEGORY_FK.sql
36. FIX_IS_CANCELLED_COMPLETE.sql
37. ALLOW_MULTIPLE_MENUS_PER_CATEGORY.sql
```

> ⚠️ NOTA: Hay ~200+ archivos SQL en migrations/. Muchos son diagnósticos y fixes puntuales que NO necesitas ejecutar. Solo los listados arriba son necesarios para un setup limpio.

## 15. ESTRATEGIA DE MULTI-TENANT (PLAN ACTUAL)

El sistema actualmente sirve a UNA concesionaria con múltiples sedes. Para vender a otras concesionarias:

**Fase actual (Feb 2026)**: Opción A — Clonar repositorio + nuevo proyecto Supabase por cliente
**Fase futura**: Migrar a multi-tenant real con tabla `organizations` y `organization_id` en todas las tablas

Si me pides crear un nuevo cliente, necesito:
1. Crear nuevo proyecto Supabase
2. Ejecutar migraciones SQL
3. Cambiar credenciales en supabase.config.ts
4. Cambiar email de superadmin en useRole.ts
5. Desplegar en Vercel con nuevas env vars

## 16. CONVENCIONES DE CÓDIGO

- **Idioma**: Código en inglés, comentarios y UI en español
- **Componentes**: PascalCase, un componente principal por archivo
- **Hooks**: camelCase con prefijo `use`
- **Tipos**: Interfaces definidas en el mismo archivo del componente
- **Supabase queries**: Inline en el componente (no hay capa de servicios separada)
- **Estado**: useState/useEffect para estado local, Zustand solo donde es necesario
- **Errores**: try/catch + toast notification al usuario
- **Console logs**: Muchos logs de debug con emojis (🔍, ✅, ❌, 📊) — son intencionales para debugging en producción
- **Timezone**: Perú = America/Lima (UTC-5). Siempre considerar al trabajar con fechas
- **Moneda**: Soles peruanos (S/)

## 17. COSAS QUE NO DEBES HACER

1. **NO borrar console.logs** — son útiles para debug en producción
2. **NO cambiar credenciales de Supabase PROD** sin verificar
3. **NO modificar RLS policies** sin entender el impacto en todos los roles
4. **NO crear archivos .md** a menos que te lo pida explícitamente
5. **NO usar `&&` en terminal** — el usuario usa Windows/PowerShell donde el separador es `;`
6. **NO asumir que supabase es non-null** — siempre verificar `if (!supabase) return`
7. **NO hacer queries a Supabase sin filtro de school_id** cuando el usuario es gestor_unidad u operador_caja

---

## FIN DEL PROMPT — COPIAR HASTA AQUÍ ↑

---

> **Uso**: Copia todo el contenido entre "PROMPT INICIO" y "FIN DEL PROMPT" y pégalo como primer mensaje en cualquier chat nuevo. Luego haz tu pregunta específica.
>
> **Actualización**: Cada vez que hagas un cambio significativo (nueva tabla, nuevo módulo, nueva versión), actualiza este documento.
