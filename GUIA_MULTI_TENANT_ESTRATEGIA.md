# 🏗️ GUÍA: Estrategia Multi-Tenant para Parent Portal Connect

## 📋 Resumen Ejecutivo

**Tu situación actual:**
- Sistema en producción v1.22.0 (React + Vite + Supabase)
- Sirve a UNA concesionaria (Lima Café 28) con ~7 sedes/colegios
- Los niños vuelven en 5 días — NO se puede romper nada
- Otra concesionaria quiere comprar el sistema
- Necesitas decidir cómo escalarlo

**Veredicto rápido:**
| Opción | Tiempo | Riesgo | Escalabilidad | Recomendación |
|--------|--------|--------|---------------|---------------|
| A: Clonar repo + nuevo Supabase | 2-4 horas | 🟢 Cero | ⚠️ Baja (máx 5 clientes) | ✅ **HAZLO AHORA** |
| B: Multi-tenant real | 3-6 semanas | 🔴 Alto | 🟢 Infinita | 🔜 Hazlo después (marzo-abril) |
| C: Monorepo + envs | 1-2 días | 🟡 Bajo | 🟡 Media (máx 15 clientes) | 🔄 Paso intermedio |

**Mi recomendación: Opción A ahora → Opción B en marzo/abril.**

---

## 📊 Diagnóstico de tu Sistema Actual

### Lo que YA tienes bien (favorable para multi-tenant)

Tu sistema ya tiene una base sólida de separación por sede:

1. **`school_id` en casi todas las tablas** (~80+ archivos lo usan):
   - `transactions`, `students`, `lunch_orders`, `cash_registers`
   - `products` (vía `school_ids[]`), `billing_periods`, `parent_profiles`
   - `teacher_profiles` (con `school_id_1`, `school_id_2`)

2. **RLS (Row Level Security) por sede**:
   - `admin_general` → ve TODAS las sedes
   - `gestor_unidad` → solo SU sede
   - `operador_caja` → solo SU sede
   - `parent` → solo SUS hijos
   - `teacher` → solo SUS transacciones

3. **Roles bien definidos**: superadmin, admin_general, supervisor_red, gestor_unidad, operador_caja, operador_cocina, parent, teacher

4. **Configuración por sede**: billing_config, lunch_config, etc.

### Lo que FALTA para multi-tenant real

1. **No existe concepto de "organización/concesionaria"** — todas las sedes son de Lima Café 28
2. **Un solo proyecto Supabase** — una sola base de datos, un solo Auth
3. **Superadmin hardcodeado** en `useRole.ts`:
   ```typescript
   if (user.email === 'superadmin@limacafe28.com') {
     setRole('superadmin');
   }
   ```
4. **Configuración de Supabase centralizada** en `src/config/supabase.config.ts` — apunta a un solo proyecto
5. **Sin subdomains ni routing por tenant** — todo va a la misma URL
6. **Storage compartido** — un solo bucket para todos los vouchers/fotos
7. **Datos de pago centralizados** — Yape, Plin, cuentas bancarias son de Lima Café 28

---

## 🅰️ OPCIÓN A: Clonar para Nuevo Cliente (RECOMENDADA PARA AHORA)

### ¿Qué es?
Crear una copia completa e independiente del sistema para cada nuevo cliente. Cada uno tiene su propio:
- Repositorio en GitHub (o branch)
- Proyecto en Supabase (base de datos independiente)
- Deployment en Vercel (URL independiente)
- Dominio propio (opcional)

### Ventajas
- ✅ **Cero riesgo** para tu cliente actual (Lima Café 28)
- ✅ **2-4 horas** para tener un cliente nuevo funcionando
- ✅ **Aislamiento total** — si uno se cae, el otro sigue
- ✅ **Personalización libre** — puedes hacer cambios específicos por cliente
- ✅ **Facturación independiente** — cada Supabase tiene su propio plan

### Desventajas
- ⚠️ Si arreglas un bug en uno, tienes que arreglarlo en todos
- ⚠️ Nuevas features requieren merge manual en cada repo
- ⚠️ A partir de 5+ clientes se vuelve inmanejable
- ⚠️ Más proyectos Supabase = más costo ($25/mes por proyecto Pro)

### 📝 Pasos Detallados

#### PASO 1: Crear nuevo proyecto en Supabase (10 min)

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configuración:
   - **Name**: `portal-[nombre-concesionaria]` (ej: `portal-delicatering`)
   - **Database Password**: Genera una segura y guárdala
   - **Region**: South America (São Paulo) — el más cercano a Perú
   - **Plan**: Free para empezar, Pro ($25/mes) para producción
4. Espera 2-3 minutos a que se cree
5. **ANOTA** estos valores (Settings → API):
   - `Project URL`: `https://XXXXX.supabase.co`
   - `anon/public key`: `eyJhbGciOiJ...`
   - `service_role key`: `eyJhbGciOiJ...` (⚠️ NUNCA en frontend)

#### PASO 2: Clonar el repositorio (5 min)

```bash
# Opción A: Fork en GitHub (recomendado)
# Ve a https://github.com/rubennaldos/parent-portal-connect
# Click "Fork" → crea el fork en tu cuenta o una organización

# Opción B: Clonar manualmente
cd C:\Users\Alberto Naldos\Desktop\miproyecto
git clone https://github.com/rubennaldos/parent-portal-connect.git portal-[nombre-cliente]
cd portal-[nombre-cliente]

# Cambiar el origin a un nuevo repo
git remote set-url origin https://github.com/TU_CUENTA/portal-[nombre-cliente].git
git push -u origin main
```

#### PASO 3: Configurar variables de entorno (5 min)

Crear archivo `.env` en la raíz del nuevo proyecto:

```env
# .env (para desarrollo local)
VITE_SUPABASE_URL=https://XXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

Actualizar `src/config/supabase.config.ts`:

```typescript
const PROD_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://XXXXX.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'nueva_anon_key_aqui',
};
```

#### PASO 4: Migrar el esquema de base de datos (30-60 min)

Esto es lo más importante. Necesitas ejecutar las migraciones SQL **en orden** en el nuevo proyecto Supabase.

**Lista de migraciones esenciales (ejecutar en este orden en el SQL Editor):**

```
1.  SISTEMA_REGISTRO_PADRES_DB.sql          → Tablas base: schools, parent_profiles, students
2.  CREATE_SALES_TABLE.sql                  → Tabla transactions
3.  FIX_TRANSACTIONS_SCHOOL_RELATION.sql    → school_id en transactions
4.  CREATE_TEACHER_PROFILES_TABLE.sql       → Tabla teacher_profiles
5.  SETUP_PRECIOS_POR_SEDE.sql              → product_school_prices
6.  SETUP_GRADOS_SALONES_PERSONALIZABLES.sql → school_levels, school_classrooms
7.  CREATE_LUNCH_CATEGORIES_SYSTEM.sql      → lunch_categories, lunch_menus
8.  CREATE_LUNCH_ADDONS_SYSTEM.sql          → lunch_addons
9.  CREATE_CASH_REGISTER_SYSTEM.sql         → cash_registers, cash_movements
10. CREATE_RECHARGE_REQUESTS.sql            → recharge_requests (pagos/vouchers)
11. CREATE_PERMISSIONS_SYSTEM.sql           → role_permissions, modules
12. INSERT_ALL_MODULES.sql                  → Datos de módulos
13. SETUP_FACTURACION_ELECTRONICA.sql       → billing_config, nubefact
14. SETUP_STORAGE_BUCKET.sql                → Bucket para vouchers/fotos
```

**Luego las RLS:**
```
15. RECREATE_ALL_TRANSACTIONS_RLS_POLICIES.sql
16. FIX_LUNCH_MENUS_RLS_BY_SCHOOL.sql
17. CREATE_ALL_CASH_RLS_POLICIES.sql
18. FIX_PRODUCT_SCHOOL_PRICES_RLS.sql
19. FIX_STORAGE_POLICIES.sql
```

**Luego los fixes y features recientes:**
```
20. ADD_PAYMENT_TYPE_TO_RECHARGE_REQUESTS.sql
21. ADD_PAID_TRANSACTION_IDS_TO_RECHARGE_REQUESTS.sql
22. FIX_CHECK_STUDENT_SPENDING_LIMIT.sql
23. ADD_QUANTITY_TO_LUNCH_ORDERS.sql
24. FIX_LUNCH_ORDERS_UNIQUE_CONSTRAINT.sql
25. FIX_LUNCH_MENUS_CATEGORY_FK.sql
```

> ⚠️ **IMPORTANTE**: Antes de ejecutar, revisa cada SQL y elimina los `INSERT INTO` de datos específicos de Lima Café 28 (sedes, usuarios de prueba, etc.)

#### PASO 5: Crear datos iniciales del nuevo cliente (15 min)

```sql
-- Insertar las sedes del nuevo cliente
INSERT INTO schools (name, code, is_active) VALUES
  ('Sede Principal - [Nombre]', 'sede-principal', true),
  ('Sede Secundaria - [Nombre]', 'sede-secundaria', true);

-- Crear el superadmin del nuevo cliente
-- (Primero registrar al usuario vía la app, luego actualizar su rol)
UPDATE profiles SET role = 'admin_general' WHERE email = 'admin@nuevocliente.com';
```

#### PASO 6: Personalizar el superadmin (5 min)

En `src/hooks/useRole.ts`, cambiar el email hardcodeado:

```typescript
// ANTES (Lima Café 28)
if (user.email === 'superadmin@limacafe28.com') {

// DESPUÉS (Nuevo cliente)
if (user.email === 'superadmin@nuevocliente.com') {
```

#### PASO 7: Desplegar en Vercel (10 min)

1. Ve a [https://vercel.com](https://vercel.com)
2. **"Add New"** → **"Project"**
3. Importa el nuevo repositorio de GitHub
4. Configura las **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://XXXXX.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJ...`
5. Click **"Deploy"**
6. Tu nuevo cliente estará en: `https://portal-nuevocliente.vercel.app`

#### PASO 8: Dominio personalizado (opcional, 10 min)

1. En Vercel → Settings → Domains
2. Agregar: `app.nuevocliente.com`
3. Configurar DNS (CNAME → `cname.vercel-dns.com`)

#### Resultado Final — Opción A

```
CLIENTE 1 (Lima Café 28) — INTACTO:
├── GitHub: rubennaldos/parent-portal-connect
├── Supabase: duxqzozoahvrvqseinji.supabase.co  
├── Vercel: portal-limacafe.vercel.app
└── 7 sedes (Nordic, St. George's, Maristas, etc.)

CLIENTE 2 (Nuevo) — INDEPENDIENTE:
├── GitHub: rubennaldos/portal-nuevocliente
├── Supabase: NUEVO_PROYECTO.supabase.co
├── Vercel: portal-nuevocliente.vercel.app
└── N sedes (las que necesite)
```

**Tiempo total: 2-4 horas** (la mayor parte es ejecutar migraciones SQL).

---

## 🅱️ OPCIÓN B: Multi-Tenant Real (PARA DESPUÉS — Marzo/Abril 2026)

### ¿Qué es?
Un solo deployment, una sola base de datos, con una capa de "organización" que aísla los datos de cada concesionaria.

### Arquitectura

```
                    ┌──────────────────────┐
                    │   app.tudominio.com   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                 │
    limacafe.app.com   delicatering.app.com   otro.app.com
              │                │                 │
              └────────────────┼────────────────┘
                               │
                    ┌──────────┴───────────┐
                    │    UN SOLO Supabase    │
                    │   UN SOLO deployment   │
                    │   UNA base de datos    │
                    └──────────────────────┘
```

### Cambios necesarios en la base de datos

#### 1. Nueva tabla `organizations`

```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,           -- "Lima Café 28", "DeliCatering SAC"
  slug VARCHAR(100) UNIQUE NOT NULL,    -- "limacafe28", "delicatering"
  ruc VARCHAR(11),                      -- RUC de la empresa
  logo_url TEXT,
  contact_email VARCHAR(200),
  contact_phone VARCHAR(20),
  plan VARCHAR(50) DEFAULT 'basic',     -- basic, pro, enterprise
  max_schools INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Agregar `organization_id` a TODAS las tablas principales

```sql
-- Esto hay que hacer en CADA tabla
ALTER TABLE schools          ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles         ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE products         ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE transactions     ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE students         ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE parent_profiles  ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE teacher_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE lunch_orders     ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE lunch_menus      ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE lunch_categories ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE cash_registers   ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE cash_movements   ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE billing_config   ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE billing_periods  ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE recharge_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE school_levels    ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE school_classrooms ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE product_school_prices ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Crear índices
CREATE INDEX idx_schools_org ON schools(organization_id);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_transactions_org ON transactions(organization_id);
-- ... (uno por cada tabla)
```

#### 3. Backfill datos existentes (Lima Café 28)

```sql
-- Crear la organización de Lima Café 28
INSERT INTO organizations (name, slug, ruc, is_active) 
VALUES ('Lima Café 28', 'limacafe28', '20XXXXXXXXX', true)
RETURNING id;

-- Supongamos que el id retornado es: 'org-uuid-limacafe28'

-- Actualizar TODAS las tablas
UPDATE schools SET organization_id = 'org-uuid-limacafe28';
UPDATE profiles SET organization_id = 'org-uuid-limacafe28';
UPDATE products SET organization_id = 'org-uuid-limacafe28';
UPDATE transactions SET organization_id = 'org-uuid-limacafe28';
UPDATE students SET organization_id = 'org-uuid-limacafe28';
-- ... (cada tabla)

-- Hacer NOT NULL después del backfill
ALTER TABLE schools ALTER COLUMN organization_id SET NOT NULL;
-- ... (cada tabla)
```

#### 4. Actualizar TODAS las RLS policies

```sql
-- EJEMPLO: transactions
DROP POLICY "Admin general puede ver todas las transacciones" ON transactions;

CREATE POLICY "Admin general puede ver transacciones de su organización"
ON transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin_general'
    AND p.organization_id = transactions.organization_id  -- ← CLAVE
  )
);
```

Esto hay que hacerlo para **CADA política de CADA tabla**. Son ~40+ políticas.

#### 5. Cambios en el Frontend (~80+ archivos)

**A. Nuevo hook `useOrganization`:**

```typescript
// src/hooks/useOrganization.ts
export function useOrganization() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchOrg = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('organization_id, organizations(slug, name)')
        .eq('id', user.id)
        .single();
      
      setOrgId(data?.organization_id);
      setOrgSlug(data?.organizations?.slug);
    };
    
    fetchOrg();
  }, [user]);
  
  return { orgId, orgSlug };
}
```

**B. Agregar `organization_id` a TODOS los inserts:**

En cada componente que haga `supabase.from('tabla').insert(...)`, agregar `organization_id`:

```typescript
// ANTES
await supabase.from('transactions').insert({
  student_id, amount, type: 'purchase', school_id
});

// DESPUÉS
await supabase.from('transactions').insert({
  student_id, amount, type: 'purchase', school_id, 
  organization_id: orgId  // ← NUEVO
});
```

Esto afecta a **~80+ archivos** en `src/`.

**C. Subdomain routing (opcional pero recomendado):**

```typescript
// src/lib/tenant.ts
export function getTenantSlug(): string | null {
  const hostname = window.location.hostname;
  // limacafe28.tuapp.com → "limacafe28"
  // delicatering.tuapp.com → "delicatering"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null; // localhost o dominio sin subdomain
}
```

### Estimación de trabajo — Opción B

| Tarea | Tiempo estimado |
|-------|----------------|
| Diseñar schema + tabla organizations | 2 horas |
| Agregar organization_id a todas las tablas | 4 horas |
| Backfill datos existentes | 2 horas |
| Reescribir TODAS las RLS policies (~40) | 8 horas |
| Hook useOrganization + integración | 4 horas |
| Actualizar ~80 archivos (inserts/queries) | 16-24 horas |
| Subdomain routing | 4 horas |
| Onboarding de nuevos clientes | 4 horas |
| Testing exhaustivo | 8-16 horas |
| **TOTAL** | **50-70 horas (~3-4 semanas)** |

### Riesgos de la Opción B

- 🔴 **Tocar CADA archivo del sistema** — alto riesgo de bugs
- 🔴 **Downtime** — necesitas planificar una ventana de mantenimiento
- 🔴 **RLS policies** — si te equivocas, un cliente puede ver datos de otro
- 🔴 **Rollback complejo** — si algo falla a medias, es difícil volver atrás
- 🟡 **Performance** — más datos en una sola DB, índices más grandes
- 🟡 **Supabase free tier** — con muchos clientes puedes superar los límites rápido

---

## 🔄 OPCIÓN C: Monorepo + Múltiples Supabase (INTERMEDIA)

### ¿Qué es?
UN SOLO repositorio de código, pero cada cliente tiene su propio proyecto Supabase y su propio deployment en Vercel.

### Ventaja sobre Opción A
- **Un solo código** — arreglas un bug y todos los clientes lo reciben
- **Sin riesgo de divergencia** — no hay repos separados que se desincronicen

### Cómo funciona

```
GitHub: UN SOLO REPO
├── src/                    ← código compartido
├── clients/
│   ├── limacafe28/
│   │   ├── .env           ← Supabase de Lima Café 28
│   │   └── config.ts      ← Superadmin email, logo, colores
│   ├── delicatering/
│   │   ├── .env           ← Supabase del nuevo cliente
│   │   └── config.ts      ← Su superadmin, logo, colores
│   └── ...
├── vercel.json
└── package.json
```

### Pasos

#### 1. Crear archivo de configuración por cliente

```typescript
// src/config/clients/index.ts
interface ClientConfig {
  name: string;
  slug: string;
  superadminEmail: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  logo?: string;
  primaryColor?: string;
}

const CLIENTS: Record<string, ClientConfig> = {
  limacafe28: {
    name: 'Lima Café 28',
    slug: 'limacafe28',
    superadminEmail: 'superadmin@limacafe28.com',
    supabaseUrl: 'https://duxqzozoahvrvqseinji.supabase.co',
    supabaseAnonKey: 'sb_publishable_...',
  },
  delicatering: {
    name: 'DeliCatering SAC',
    slug: 'delicatering',
    superadminEmail: 'admin@delicatering.com',
    supabaseUrl: 'https://NUEVO_PROYECTO.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJ...',
  },
};

// Detectar cliente por subdomain o env var
export function getCurrentClient(): ClientConfig {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // limacafe28.tuapp.com → "limacafe28"
  const subdomain = hostname.split('.')[0];
  if (CLIENTS[subdomain]) return CLIENTS[subdomain];
  
  // Fallback a variable de entorno
  const envClient = import.meta.env.VITE_CLIENT_SLUG;
  if (envClient && CLIENTS[envClient]) return CLIENTS[envClient];
  
  // Default
  return CLIENTS.limacafe28;
}
```

#### 2. Modificar `supabase.ts` para usar config por cliente

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { getCurrentClient } from "@/config/clients";

const client = getCurrentClient();

export const supabase = createClient(
  client.supabaseUrl, 
  client.supabaseAnonKey
);
```

#### 3. Múltiples deployments en Vercel

Cada cliente es un deployment separado:

```bash
# Cliente 1
vercel --prod --env VITE_CLIENT_SLUG=limacafe28

# Cliente 2
vercel --prod --env VITE_CLIENT_SLUG=delicatering
```

O mejor: configurar subdominios en Vercel → cada subdomain tiene su propia variable de entorno.

### Estimación — Opción C

| Tarea | Tiempo |
|-------|--------|
| Sistema de config por cliente | 2-3 horas |
| Migrar Supabase config | 1 hora |
| Cambiar superadmin hardcodeado | 30 min |
| Script de migración de BD | 1-2 horas |
| Nuevo deployment en Vercel | 30 min |
| Testing | 2 horas |
| **TOTAL** | **7-9 horas** |

---

## 🎯 Plan de Acción Recomendado

### AHORA (Febrero 2026) — Antes de que empiecen las clases

**Hacer Opción A** para el nuevo cliente:

```
Día 1 (2-4 horas):
├── [x] Crear nuevo proyecto Supabase
├── [x] Clonar repositorio
├── [x] Ejecutar migraciones SQL
├── [x] Crear sedes y admin del nuevo cliente
├── [x] Desplegar en Vercel
└── [x] ¡LISTO! El nuevo cliente ya puede operar
```

### MARZO 2026 — Después de que todo esté estable

**Migrar a Opción C** (monorepo + múltiples Supabase):

```
Semana 1:
├── Crear sistema de config por cliente
├── Hacer que supabase.ts sea dinámico
├── Mover superadmin hardcodeado a config
└── Testing local con ambos clientes

Semana 2:
├── Configurar subdominios en Vercel
├── Migrar cliente 1 (Lima Café 28) al nuevo sistema
├── Migrar cliente 2 al nuevo sistema
└── Eliminar el repo clonado
```

### ABRIL-MAYO 2026 — Si consigues 5+ clientes

**Migrar a Opción B** (multi-tenant real):

```
Semana 1-2: Diseño + tabla organizations + backfill
Semana 3: Actualizar RLS policies + hooks
Semana 4: Actualizar todos los componentes (inserts)
Semana 5: Testing exhaustivo
Semana 6: Migración en vivo (ventana de mantenimiento)
```

---

## 💰 Consideraciones de Costos

### Supabase

| Plan | Precio | Incluye |
|------|--------|---------|
| Free | $0/mes | 500MB DB, 1GB storage, 2GB bandwidth |
| Pro | $25/mes | 8GB DB, 100GB storage, 250GB bandwidth |
| Team | $599/mes | Todo ilimitado, SOC2, prioridad |

**Con Opción A**: $25/mes × N clientes (cada uno tiene su proyecto)
**Con Opción B**: $25-599/mes (un solo proyecto para todos)

### Vercel

| Plan | Precio | Incluye |
|------|--------|---------|
| Hobby | $0/mes | 1 deployment, 100GB bandwidth |
| Pro | $20/mes | Subdominios, analytics, 1TB bandwidth |

### Modelo de Negocio Sugerido

```
Lo que tú pagas por cliente:
├── Supabase Pro: $25/mes
├── Vercel (prorrateado): ~$5/mes
├── Tu tiempo de setup: ~$X (único)
└── Total costo: ~$30/mes por cliente

Lo que cobras al cliente:
├── Setup inicial: S/ 2,000 - 5,000 (único)
├── Mensualidad: S/ 500 - 1,500/mes (según # sedes)
├── Soporte: Incluido en mensualidad
└── Actualizaciones: Incluidas
```

---

## 🔐 Seguridad: Puntos Críticos

### Si usas Opción A o C (Supabase separados)
- ✅ **Aislamiento total** — imposible que un cliente vea datos de otro
- ✅ Las RLS actuales son suficientes
- ⚠️ Asegúrate de NO dejar la `service_role key` en el frontend

### Si usas Opción B (multi-tenant en una sola DB)
- 🔴 **RLS DEBE ser perfecta** — un error expone datos de otro cliente
- 🔴 Necesitas auditoría constante de las policies
- 🔴 Cada nuevo feature DEBE incluir `organization_id` en RLS
- Recomendado: tests automatizados que verifiquen aislamiento

---

## 📋 Checklist: Clonar para Nuevo Cliente (Opción A)

```
PREPARACIÓN:
□ Crear proyecto en Supabase (anotar URL + keys)
□ Clonar/fork repositorio en GitHub
□ Crear nuevo proyecto en Vercel

BASE DE DATOS:
□ Ejecutar migraciones SQL en orden
□ Crear tabla schools con las sedes del cliente
□ Crear Storage bucket "vouchers"
□ Verificar que RLS esté habilitado en todas las tablas

CÓDIGO:
□ Actualizar supabase.config.ts con nuevas credenciales
□ Cambiar email de superadmin en useRole.ts
□ Verificar que .env tenga las variables correctas
□ (Opcional) Cambiar logo/nombre en el UI

DEPLOYMENT:
□ Push a GitHub
□ Verificar que Vercel compile sin errores
□ Configurar variables de entorno en Vercel
□ (Opcional) Configurar dominio personalizado

DATOS INICIALES:
□ Registrar al admin del cliente vía la app
□ Actualizar su rol a admin_general en Supabase
□ Crear las sedes en la tabla schools
□ Configurar módulos y permisos
□ El cliente puede empezar a agregar padres/profesores/productos

VERIFICACIÓN:
□ Login funciona
□ Se ven las sedes correctas
□ POS funciona
□ Pedidos de almuerzo funcionan
□ Pagos/vouchers funcionan
□ Reportes/dashboard funcionan
□ Impresión de tickets funciona (si aplica)
```

---

## ❓ Preguntas Frecuentes

### ¿Y si quiero que todos los clientes compartan los mismos productos?
No es común. Cada concesionaria tiene sus propios productos y precios. Con Opción A y C, cada uno tiene su propia tabla `products`.

### ¿Puedo migrar de Opción A a Opción B después?
Sí. Tendrás que hacer un script que:
1. Cree la tabla `organizations`
2. Importe los datos de cada Supabase separado al nuevo DB unificado
3. Asigne `organization_id` a todos los registros importados

### ¿Qué pasa con las actualizaciones del sistema?
- **Opción A**: `git merge` manual en cada repo (tedioso con 5+ clientes)
- **Opción C**: Un solo push, múltiples deployments automáticos (ideal)
- **Opción B**: Un solo push, un solo deployment (perfecto)

### ¿Puedo usar la Opción A y después migrar a C fácilmente?
Sí, es el camino recomendado. La Opción C es básicamente "centralizar el código" sin tocar la base de datos.

### ¿Cuántos clientes puedo manejar con cada opción?
- **Opción A**: Cómodo hasta 3-4 clientes. Posible hasta 5-7 con disciplina.
- **Opción C**: Cómodo hasta 10-15 clientes.
- **Opción B**: Ilimitado (solo limitado por el plan de Supabase).

---

## 🏳️ LA ESTRATEGIA CORRECTA: "SISTEMA BLANCO" (Template Dorado)

### El problema de tener N sistemas distintos

```
❌ LO QUE NO QUIERES:

Repo Cliente 1 (v1.22.0)  →  Arreglas bug  →  ✅ funciona
Repo Cliente 2 (v1.22.0)  →  Te olvidas     →  ❌ sigue roto
Repo Cliente 3 (v1.20.0)  →  Versión vieja  →  ❌ le faltan features
Repo Cliente 4 (v1.22.0)  →  Cambio custom  →  ❌ incompatible con update

Resultado: 4 sistemas diferentes, 4 dolores de cabeza, 4x el trabajo.
```

### La solución: UN repo "golden master" + forks controlados

```
✅ LO QUE SÍ QUIERES:

                    ┌─────────────────────────┐
                    │   🏳️ SISTEMA BLANCO       │
                    │   (Template / Golden)     │
                    │   repo: portal-template   │
                    │   SIN datos de cliente    │
                    │   SIN credenciales        │
                    │   CON todas las features  │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         Fork/Clone    Fork/Clone    Fork/Clone
              │              │              │
    ┌─────────▼──────┐ ┌────▼─────────┐ ┌──▼──────────────┐
    │ Lima Café 28   │ │ Cliente 2    │ │ Cliente 3       │
    │ (Producción)   │ │ (Nuevo)      │ │ (Futuro)        │
    │ Su Supabase    │ │ Su Supabase  │ │ Su Supabase     │
    │ Su Vercel      │ │ Su Vercel    │ │ Su Vercel       │
    │ Sus customs    │ │ Sus customs  │ │ Sus customs     │
    └────────────────┘ └──────────────┘ └─────────────────┘
```

### ¿Qué es el "Sistema Blanco"?

Es una versión **LIMPIA** de tu sistema actual que:

1. **NO tiene** credenciales de Supabase (usa placeholders)
2. **NO tiene** datos hardcodeados de Lima Café 28
3. **NO tiene** el email de superadmin hardcodeado
4. **SÍ tiene** TODAS las features del sistema
5. **SÍ tiene** instrucciones claras de setup
6. **SÍ tiene** migraciones SQL organizadas y limpias

### Paso a paso: Crear el Sistema Blanco

#### PASO 1: Crear el repo template (30 min)

```bash
# Desde tu proyecto actual, crear una copia limpia
cd C:\Users\Alberto Naldos\Desktop\miproyecto
git clone https://github.com/rubennaldos/parent-portal-connect.git portal-template
cd portal-template

# Cambiar el remote a un nuevo repo
# (Primero crear el repo "portal-template" en GitHub)
git remote set-url origin https://github.com/rubennaldos/portal-template.git
```

#### PASO 2: Limpiar credenciales y datos específicos

**Archivo: `src/config/supabase.config.ts`** — Limpiar:
```typescript
const PROD_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',  // Vacío - cada cliente pone el suyo
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};
```

**Archivo: `src/hooks/useRole.ts`** — Hacer configurable:
```typescript
// ANTES: hardcodeado
if (user.email === 'superadmin@limacafe28.com') {

// DESPUÉS: configurable vía variable de entorno
const SUPERADMIN_EMAIL = import.meta.env.VITE_SUPERADMIN_EMAIL || '';
if (SUPERADMIN_EMAIL && user.email === SUPERADMIN_EMAIL) {
```

**Archivo: `.env.example`** — Crear plantilla:
```env
# Credenciales de Supabase (obtener de supabase.com → Settings → API)
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Email del superadmin (el programador/dueño del sistema)
VITE_SUPERADMIN_EMAIL=admin@tuempresa.com
```

#### PASO 3: Limpiar migraciones SQL

Crear UN SOLO archivo consolidado: `SETUP_COMPLETO.sql` que ejecute todo en orden, SIN datos de ejemplo específicos de Lima Café 28.

#### PASO 4: Marcar el repo como template en GitHub

1. Ve a GitHub → `portal-template` → Settings
2. Marca ☑️ **"Template repository"**
3. Ahora cualquier persona (o tú) puede hacer click en **"Use this template"** para crear un nuevo repo

### Flujo para cada nuevo cliente

```
NUEVO CLIENTE "DeliCatering" — PROCESO:

1. En GitHub: "Use this template" → crear "portal-delicatering"
2. En Supabase: crear nuevo proyecto → anotar URL + keys
3. Clonar el nuevo repo localmente
4. Copiar .env.example → .env → llenar credenciales
5. Ejecutar SETUP_COMPLETO.sql en Supabase SQL Editor
6. Insertar sedes del cliente en tabla schools
7. Registrar al admin → cambiar su rol a admin_general
8. Desplegar en Vercel con env vars
9. ¡LISTO! Tiempo total: ~2 horas

Si el cliente necesita algo CUSTOM:
→ Se hace en SU repo (portal-delicatering)
→ NO afecta al template ni a otros clientes
→ Cuando hay un update importante en el template,
   se hace cherry-pick o merge selectivo
```

### ¿Cómo actualizar TODOS los clientes cuando hay un fix importante?

```bash
# En el repo de un cliente (ej: portal-delicatering)
git remote add template https://github.com/rubennaldos/portal-template.git
git fetch template
git merge template/main --no-commit

# Revisar cambios, resolver conflictos si hay
# Los cambios custom del cliente se preservan
git commit -m "sync: actualizar desde template v1.23.0"
git push origin main
# Vercel despliega automáticamente
```

### Personalización por cliente: ¿Qué sí y qué no?

| Se personaliza POR CLIENTE | Se mantiene IGUAL en todos |
|---|---|
| Credenciales de Supabase | Toda la lógica de negocio |
| Email de superadmin | Componentes UI |
| Sedes (schools) | Hooks y contextos |
| Productos y precios | Sistema de roles |
| Logo/marca (futuro) | RLS policies |
| Datos de pago (Yape, banco) | Migraciones SQL base |
| Configuración de billing | Rutas y navegación |

### ¿Y si un cliente necesita una feature que otros no?

**Opción 1: Feature flags (recomendado)**
```typescript
// .env del cliente
VITE_FEATURE_LOGISTICS=true
VITE_FEATURE_NUBEFACT=false
VITE_FEATURE_CASH_REGISTER=true

// En el código
if (import.meta.env.VITE_FEATURE_LOGISTICS === 'true') {
  // Mostrar módulo de logística
}
```

**Opción 2: Hacer el cambio en el template**
Si es una feature útil para todos, agrégala al template. Todos los clientes la reciben cuando hagan sync.

**Opción 3: Hacer el cambio solo en el repo del cliente**
Si es MUY específico de ese cliente, se hace en su repo. Riesgo: más conflictos al hacer sync después.

### Costos del modelo "Sistema Blanco"

```
POR CLIENTE:
├── Supabase Pro: $25/mes
├── Vercel Pro (prorrateado): ~$5/mes
├── Tu tiempo de setup: ~2 horas (único)
├── Tu tiempo de sync mensual: ~30 min
└── TOTAL: ~$30/mes operativo

LO QUE COBRAS:
├── Setup inicial: S/ 2,000 - 5,000 (único)
├── Mensualidad: S/ 500 - 1,500/mes (incluye soporte + hosting)
├── Customización adicional: S/ 100-200/hora
└── MARGEN: ~85-90% (tu costo es ~$30/mes = ~S/110)
```

### Ventajas de este modelo vs Multi-tenant

| Aspecto | Sistema Blanco (repos) | Multi-tenant (una DB) |
|---|---|---|
| **Tiempo para nuevo cliente** | 2 horas | 5 minutos (pero meses de setup inicial) |
| **Aislamiento de datos** | Total (DBs separadas) | Depende de RLS (riesgo) |
| **Customización** | Libre por cliente | Complejo (feature flags) |
| **Si un cliente no paga** | Apagas SU Vercel/Supabase | Complejo de aislar |
| **Backup/restore** | Por cliente | Un backup tiene TODO |
| **Regulaciones/legal** | Cada uno tiene SUS datos | Datos mezclados |
| **Performance** | Óptima (DB dedicada) | Degrada con muchos clientes |
| **Costo por cliente** | ~$30/mes fijo | Baja a medida que escalas |
| **Escalabilidad** | Hasta ~15-20 clientes | Infinita |
| **Tu workload** | Sync manual (~30 min/cliente/mes) | Zero (un deploy) |

### Mi recomendación definitiva

**Para tu situación actual (2-5 clientes en 2026)**:

> 🏳️ **Sistema Blanco con repos separados es LA MEJOR opción.**
>
> - Funciona AHORA con mínimo esfuerzo
> - Cada cliente está aislado (legal, seguridad, billing)
> - Puedes personalizar libremente
> - Si un cliente deja de pagar, simplemente apagas SU proyecto
> - El multi-tenant real solo vale la pena con 10+ clientes
> - Y cuando llegues a 10+ clientes, vas a tener suficiente revenue para contratar a alguien que te ayude con la migración

**NO hagas multi-tenant ahora.** Es como construir un edificio de 20 pisos cuando solo necesitas 3 casas. Las 3 casas las construyes en una tarde. El edificio te toma meses y si algo falla, todos se quedan sin casa.

---

## 📞 Resumen Final

**AHORA (esta semana):**
1. Haz **Opción A** para el nuevo cliente → 2-4 horas
2. Cero riesgo para Lima Café 28
3. El nuevo cliente opera inmediatamente

**PRÓXIMA SEMANA:**
1. Crea el **Sistema Blanco** (template) → 2-3 horas
2. Limpia credenciales, consolida migraciones SQL
3. Marca como template en GitHub

**PARA CADA NUEVO CLIENTE:**
1. "Use this template" en GitHub
2. Nuevo Supabase + migraciones + Vercel
3. ~2 horas y listo

**SYNC MENSUAL (cuando hay updates):**
1. `git merge template/main` en cada repo de cliente
2. ~30 min por cliente
3. Todos reciben las mejoras

**CUANDO TENGAS 10+ CLIENTES (2027?):**
1. Evalúa migrar a multi-tenant real
2. Para entonces tendrás revenue suficiente para invertir 3-6 semanas

---

*Documento generado el 20 de febrero de 2026*
*Versión del sistema: v1.22.0*
*Stack: React + Vite + TypeScript + Supabase + Vercel*
