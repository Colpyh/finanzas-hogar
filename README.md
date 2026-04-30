# Finanzas Hogar

Aplicación web para la gestión de finanzas compartidas en el hogar. Diseñada para parejas o convivientes que necesitan llevar el control de gastos fijos, cuotas y compras, dividir costos de manera equitativa y visualizar el balance de deudas en tiempo real.

---

## Características principales

### 💰 Tres tipos de gasto
- **Gastos fijos** — servicios recurrentes (arriendo, internet, seguros). Seguimiento mensual de pago por miembro.
- **Compras en cuotas** — installments con progreso cuota por cuota. Soporte para cuotas compartidas entre miembros.
- **Compras únicas** — gastos puntuales con fecha y categoría.

### 📊 Dashboard mensual
Resumen del mes con total del hogar, parte individual, ingresos registrados, saldo disponible y widgets de estado para cada sección. Navegación por meses históricos.

### ⚖️ Balances y liquidación
Calcula automáticamente quién le debe a quién, agrupado por miembro. Los gastos compartidos se rastrean por período mensual. Liquidación directa desde la vista de balances con confirmación.

### 📩 Captura automática de gastos desde email
Webhook de Postmark que parsea notificaciones de uso de tarjeta BCI. Los gastos capturados quedan en revisión en `/gastos-pendientes` donde el usuario confirma o descarta cada uno antes de registrarlo.

### 📱 Resumen por WhatsApp
Botón en el dashboard que genera un mensaje preformateado con el resumen del mes completo (gastos fijos, cuotas, compras recientes y balance pendiente) y abre WhatsApp directamente para enviarlo.

### 📈 Reportes y gráficos
Vista de resumen con distribución por categoría, comparativa gastos fijos vs. variables, tendencia de 12 meses y carga de cuotas activas.

### 💳 Gestión de tarjetas
Registro de tarjetas del hogar con asignación de gastos por tarjeta y resumen mensual de uso.

### 👥 Hogares multi-miembro
Un usuario crea el hogar y puede invitar al otro miembro mediante un enlace con token de 7 días. Gastos privados, responsables designados y roles (`owner` / `member`).

### 🌙 Tema oscuro / claro
Preferencia almacenada por usuario en `localStorage` con soporte completo de Tailwind.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript 5) |
| Base de datos | PostgreSQL vía Supabase (hosted) |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | Supabase Auth (email/contraseña, Google OAuth, magic link) |
| UI | Tailwind CSS v4 + shadcn/ui + Base UI |
| Animaciones | Framer Motion v12 |
| Validación | Zod v4 + drizzle-zod |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| Email inbound | Postmark (webhook) |
| Tests | Jest + Testing Library + Playwright |
| Deploy | Vercel |

---

## Arquitectura

### Acceso dual a la base de datos
- **Supabase JS client** — exclusivamente para autenticación y gestión de sesión (`@supabase/ssr`, cookies SSR).
- **Drizzle ORM + pg.Pool** — todas las queries de datos, mediante conexión directa a Postgres. Evita la sobrecarga de PostgREST para queries complejas.

### Server Actions
Todas las mutaciones son `"use server"` actions de Next.js. No hay capa de API fetch en el cliente. Cada action verifica la sesión y el `householdId` del usuario antes de tocar la base de datos.

### Row Level Security (RLS)
RLS habilitado en todas las tablas. La función `is_household_member(hh_id)` de tipo `SECURITY DEFINER STABLE` evita checks recursivos. Los gastos privados (`is_private = true`) son visibles únicamente para su creador, incluso dentro del mismo hogar.

### Pipeline email → gasto
```
Postmark inbound
  → POST /api/webhooks/email/[householdId]?secret=xxx
  → Parser BCI (regex sobre TextBody)
  → INSERT pending_expense (payload JSON crudo siempre almacenado)
  → /gastos-pendientes (revisión del usuario)
  → confirmPendingExpense() → INSERT expense
```
Idempotencia garantizada por SHA-256 del `MessageID` de Postmark.

### Soft deletes
Los gastos se marcan con `deleted_at` en lugar de eliminarse físicamente. Preserva el historial y permite auditoría.

### Cliente DB lazy con Proxy
El pool de conexiones se instancia al primer uso mediante un `Proxy` de JavaScript. Previene crashes en rutas estáticas y en arranques en frío de Vercel cuando `DATABASE_URL` no está disponible.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/              # Rutas protegidas (requieren sesión + hogar)
│   │   ├── dashboard/
│   │   ├── gastos-fijos/
│   │   ├── compras/
│   │   ├── gastos-pendientes/
│   │   ├── ingresos/
│   │   ├── balances/
│   │   ├── resumen/
│   │   └── ajustes/
│   ├── auth/               # Login, registro, reset de contraseña
│   ├── invite/[token]/     # Redención de invitaciones
│   ├── onboarding/         # Crear o unirse a un hogar
│   └── api/
│       └── webhooks/email/ # Webhook Postmark
├── auth/
├── balances/
├── bug-report/
├── compras/
├── dashboard/
├── email-inbound/
├── gastos-fijos/
├── household/
├── ingresos/
├── onboarding/
├── resumen/
├── shared/
│   ├── components/         # BottomNav, MonthSelector, ConfirmDialog, CurrencyDisplay…
│   └── lib/
│       └── db/             # Schema Drizzle, cliente lazy, helpers
└── tarjetas/
```

---

## Variables de entorno

```env
DATABASE_URL=                      # Conexión directa a PostgreSQL (Supabase)
NEXT_PUBLIC_SUPABASE_URL=          # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Clave anon pública de Supabase
SUPABASE_SERVICE_ROLE_KEY=         # Clave service role (webhook email, bypass RLS)
NEXT_PUBLIC_SITE_URL=              # URL pública del sitio (OAuth redirects, emails)
WEBHOOK_SECRET=                    # Secret HMAC para el webhook de Postmark
ADMIN_EMAIL=                       # Email con acceso al panel de administración
```

---

## Inicio rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# completar con credenciales de Supabase y configuración local

# Aplicar migraciones
npx drizzle-kit migrate

# Iniciar servidor de desarrollo
npm run dev
```

---

## Tests

```bash
# Unit y componentes
npm test

# End-to-end
npx playwright test
```

---

## Despliegue

El proyecto está configurado para desplegarse en **Vercel**. El cliente de base de datos usa un pool perezoso compatible con el modelo serverless. La conexión a Supabase Postgres requiere `ssl: { rejectUnauthorized: false }`.

Cada push a `main` activa un deploy automático en Vercel.

---

## Esquema de base de datos

| Tabla | Descripción |
|---|---|
| `household` | Hogar con nombre y propietario |
| `household_member` | Miembros del hogar con rol (`owner` / `member`) |
| `household_invite` | Tokens de invitación con expiración a 7 días |
| `expense` | Tabla unificada para los tres tipos de gasto |
| `fixed_expense_payment` | Registro de pagos mensuales por miembro y período |
| `income` | Ingresos mensuales por miembro |
| `card` | Tarjetas del hogar para asignación de gastos |
| `category` | Categorías (sistema o por hogar) |
| `pending_expense` | Gastos capturados por email pendientes de revisión |
| `bug_report` | Reportes de errores enviados desde la app |
