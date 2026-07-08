---
name: finanzas-hogar
description: >
  Convenciones, patrones y estándares del proyecto finanzas-hogar.
  Trigger: Cualquier tarea de código en finanzas-hogar — queries, actions, UI, caching, diseño.
license: Apache-2.0
metadata:
  author: colpyh
  version: "1.4"
---

## Stack

- **Next.js 16.2** — App Router, `cacheComponents: true`, PPR habilitado
- **React 19** — Server Components por defecto; `"use client"` solo cuando hay estado/interactividad
- **TypeScript** — strict mode
- **Drizzle ORM** + **Supabase** (PostgreSQL) — esquemas en `src/db/schema/`, cliente en `src/shared/lib/db`
- **Tailwind CSS** + **shadcn/ui** (Base UI, no Radix)
- **Sonner** — toasts

---

## Estructura de carpetas

Feature-first, NO por tipo:

```
src/
  {feature}/
    actions.ts        # Server Actions ("use server")
    queries.ts        # DB queries ("use cache" donde aplique)
    types.ts          # Zod schemas + tipos
    components/       # Componentes del feature
  app/
    (app)/            # Rutas protegidas por auth
    api/              # Route Handlers
  shared/             # Utilitarios globales
```

---

## Compact Rules (inyectar en sub-agentes)

### AUTH — Patrón obligatorio en Server Actions y Pages

```ts
const user = await getUser();                      // cookies() internamente
const household = await getUserHousehold(user.id); // null si no tiene hogar
if (!household) throw new Error("No household");   // o return { error: "..." }
// usar household.id para todas las queries
```

### CACHING — Next.js 16 `use cache`

```ts
// QUERIES: 'use cache' DENTRO del cuerpo de la función (no a nivel de archivo)
import { cacheTag } from "next/cache";

export async function getMyQuery(householdId: string) {
  'use cache'
  cacheTag(householdId)   // tag = UUID del hogar
  return db.select()...
}

// ACTIONS: updateTag() para invalidar (NO revalidateTag — requiere 2 args en Next.js 16)
import { updateTag } from "next/cache";

export async function myMutation() {
  'use server'
  // ... mutation ...
  updateTag(household.id);     // invalida TODA la caché del hogar
  revalidatePath("/ruta");     // invalida el router cache de la página
}
```

**Reglas críticas de caching:**
- `'use cache'` SIEMPRE dentro del body de la función, nunca a nivel de archivo
- Tag = `householdId` (UUID) — clave por hogar, no por usuario
- `updateTag` en CADA Server Action que mute datos de expenses, income, categories, balances
- NO cachear queries con `search` (input del usuario) — cache pollution
- `revalidatePath` se mantiene junto a `updateTag` (no reemplaza)
- Query que depende del usuario: separar la parte por-hogar (cacheada) del cálculo por-usuario (post-caché) — ver `getHouseholdDebtItems`/`getPendingBalances`. Args de `'use cache'` deben ser serializables (arrays/objetos planos, NO `Map`)
- `getUserHousehold` está cacheada con tag `user-household-{userId}` (helper `userHouseholdTag`) + tag del hogar. Toda mutación de membresía (crear hogar, canjear invitación, addMemberByEmail, removeMember) DEBE invalidar ese tag del usuario afectado

### DISEÑO — Design System

```css
/* Tokens disponibles */
--shadow-sm / --shadow-md / --shadow-violet
--success-line    /* stripe verde */
--amber-line      /* stripe amarillo */
--pending-line    /* stripe gris/pendiente */
--card-2          /* fondo alternativo de card */
--fg-soft         /* texto secundario suave */
```

**Dark mode**: atributo `data-theme="dark"` en `<html>` — NO clase `.dark`

**Cards container (GroupCard)**:
```tsx
<div className="bg-card border border-border rounded-[20px] overflow-hidden"
     style={{ boxShadow: "var(--shadow-sm)" }}>
```

**Tipografía común**:
- Título de página: `text-[23px] font-semibold` + `letterSpacing: "-0.02em"`
- Subtítulo sección: `text-[14px] font-extrabold`
- Monto: `text-[14.5px] font-extrabold num` (`.num` = font-feature tabular)
- Label pequeño: `text-[11.5px] font-bold text-muted-foreground uppercase`

**Nav activo** (sidebar desktop):
```tsx
style={{ background: "rgba(124,58,237,0.08)", boxShadow: "inset 2.5px 0 0 #7c3aed" }}
```

### SERVER ACTIONS — Patrón completo

**Regla crítica**: las actions invocadas desde UI devuelven `{ error?: string }`, NUNCA lanzan para errores de negocio. Next.js redacta en producción los mensajes de errores lanzados en Server Actions — un `throw` escala al error boundary de toda la página y el usuario nunca ve el mensaje. El cliente muestra `result.error` con `toast.error()`.

```ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";

export async function myAction(rawData: unknown): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "No tienes un hogar activo" };

    // validar con Zod
    // mutar en DB con Drizzle

    updateTag(household.id);
    revalidatePath("/ruta-afectada");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error inesperado" };
  }
}
```

### QUERIES — Drizzle ORM

```ts
import { db } from "@/shared/lib/db";
import { expense } from "@/shared/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Siempre filtrar por householdId + isNull(deletedAt) para soft-delete
db.select().from(expense).where(
  and(eq(expense.householdId, householdId), isNull(expense.deletedAt))
)
```

### COMPONENTES — Reglas de React 19

- Server Components por defecto — no `"use client"` innecesario
- `"use client"` solo para: `useState`, `useEffect`, event handlers, browser APIs
- Props de server → client deben ser serializables (no funciones, no class instances)
- Formularios: `action={serverAction}` en `<form>` (no `onSubmit`)
- Toasts: `import { toast } from "sonner"` en client components

### NEXT.JS 16 — Gotchas críticos

- `searchParams` y `params` son **Promises** — siempre `await searchParams`
- `cookies()` y `headers()` son async — `await cookies()`
- NO `export const runtime = "nodejs"` en Route Handlers con `cacheComponents: true`
- NO `export const dynamic = "force-dynamic"` con `cacheComponents: true` — ROMPE el build de Turbopack ("not compatible with nextConfig.cacheComponents"). Para forzar ejecución dinámica en un Route Handler usar `await connection()` (importado de `next/server`) al inicio. Rutas que ya leen `cookies()`/`headers()`/body son dinámicas automáticamente
- `<Suspense fallback={null}>` en root layout — next-themes requiere cookies server-side
- `use cache` functions NO pueden llamar `cookies()`, `headers()`, `searchParams` directamente
- `use cache` functions tampoco deben llamar `new Date()`/`Date.now()` internamente (valor quedaría fijo en la caché) — recibir la fecha/mes como parámetro desde el caller (ver `getAnnualSummary(anchorMonth)` en `src/resumen/annual-queries.ts`)
- Leer docs en `node_modules/next/dist/docs/` antes de usar cualquier API nueva

---

## Infraestructura y Performance

- **Supabase**: región **sa-east-1 (São Paulo)** — proyecto ref `gnsxfdbuzpklfkrbqtij`. Migrado desde us-east-1 (Virginia) en jun 2026 para reducir latencia (equipo en Chile).
- **Vercel**: Function Region **gru1 (São Paulo)** — debe coincidir con la región de Supabase. Verificar con header `x-vercel-id` (debe ser `gru1::gru1`, no `gru1::iad1`).
- **API keys Supabase**: formato nuevo `sb_publishable_...` (anon) y `sb_secret_...` (service_role), NO los JWT legacy `eyJ...`. Soportados por supabase-js ≥2.101 y @supabase/ssr ≥0.10.
- **Keep-warm**: `src/app/api/health/route.ts` (`connection()` + `SELECT 1`) pingeado por cron externo (cron-job.org) cada 5 min → evita cold starts del free tier serverless.
- **Índices DB**: las tablas tienen índices `idx_*` por `householdId` + columnas de filtro. Al agregar tablas/queries nuevas, crear índice por `household_id` (+ `deleted_at` para soft-delete).
- **RLS**: TODAS las tablas public tienen RLS habilitado + policies por hogar (vía función `is_household_member`). Al crear una tabla nueva: habilitar RLS y crear policies, o queda expuesta vía REST API.

### Scripts de DB / migración (node + pg)

- `pg` está en `node_modules` del proyecto (no global) → ejecutar scripts **desde la raíz del proyecto**.
- `.env.local` puede tener credenciales desactualizadas. Para credenciales que funcionan: `vercel env pull /tmp/.env.x --environment=production`.
- Para trabajo de migración/DDL (drizzle-kit push, bulk insert) usar **Session pooler (5432)**, NO Transaction pooler (6543, solo para la app serverless).
- `drizzle-kit push` NO recrea RLS, policies, functions ni triggers — solo tablas/índices/FKs. Migrarlos aparte con `pg_get_functiondef`/`pg_get_triggerdef`/`pg_policies`.

## Modelo de negocio (gotchas críticos)

- **Gastos VARIABLES** (luz, agua): el monto real del mes vive en `fixed_expense_payment.amount`, NUNCA en `expense.amount` (que es 0/default). Y el monto del mes es el **MÁXIMO de los pagos, no la suma** (`variableMonthAmount` en `src/shared/lib/variable-expense.ts`): la fila de settlement (parte del deudor al saldar) es una fracción de la misma boleta — sumarla infla el total 1.5×.
- **Balance entre miembros = ACUMULADO** (no mensual). `getPendingBalances(householdId, memberCount, memberMap, currentUserId)` suma la deuda de TODOS los meses no saldados; persiste hasta saldar por item (expense+mes) con `settleBalanceItem`. Internamente los ítems de deuda están cacheados a nivel hogar (`getHouseholdDebtItems`, `cacheTag(householdId)`); solo el signo del neto y la agrupación se calculan por usuario, post-caché.
- **Guard de deuda pendiente**: `pendingDebtGuard(householdId, userId, expenseId)` (`src/balances/guards.ts`) bloquea `deleteExpense`/`deleteFixedExpense` si el gasto tiene meses sin saldar; `removeMember` tiene el guard equivalente por miembro. El balance solo ve gastos/miembros vivos — borrar sin guard hace desaparecer deuda en silencio.
- **Cuotas COMPARTIDAS — cierre de mes**: `markAsMonthlyPayer`/`registerInstallmentShare`/`settleBalanceItem` llaman `syncSharedInstallmentCounter` tras un insert de pago exitoso — incrementa `installmentsPaid` (atómico, SQL) cuando todos los miembros registraron su parte del mes. Los incrementos de contador se hacen SIEMPRE con SQL atómico (`coalesce(...) + 1` + condición `< total`), nunca read-modify-write en JS.
- **Compras one_time — estado de pago**: columna `expense.paidAt` (nullable). `isPaid = !cardId || paidAt != null`. `toggleExpensePaid` valida type=one_time + tarjeta presente + no borrado.
- **Reparto compartido**: `getPendingBalances` y `getDashboardSummary`/`myShare()` reciben `memberCount` y dividen dinámicamente. OJO: el reparto histórico usa el count ACTUAL — si el hogar crece a 3+, los meses viejos se recalculan retroactivamente (pendiente: persistir reparto por período).
- **Billing period**: `billingPeriodForMonth` clampea inicio Y fin al largo real del mes (`Math.min(closingDay, últimoDía)`). Sin el clamp del inicio, closingDay=30 + febrero dejaba compras del 1-2 de marzo fuera de todo período.

## Patrones de UI

- **Botón interactivo dentro de un `<Link>`**: el handler DEBE hacer `e.preventDefault()` + `e.stopPropagation()` en un client component, sino el click también navega (ej. `mark-paid-button.tsx`, `repeat-purchase-button.tsx`).
- **Páginas con datos de ejemplo (mocks)**: usar `getSessionUser()` (`src/auth/queries.ts`) — devuelve null SOLO sin sesión. NUNCA envolver las queries reales en try/catch vacío: un error real debe ir al error boundary, no mostrar cifras falsas como reales.
- **Moneda**: SIEMPRE `formatCurrency` de `currency-display.tsx` — nada de `toLocaleString` ad-hoc. Default de schema: CLP.
- **Listas colapsables**: `INITIAL_VISIBLE` + estado `expanded` + botón "Ver más/todas" (dashboard widgets, categorías en ajustes).
- **Animaciones de entrada**: CSS puro (`@keyframes` + `animation-delay`), NO librerías de animación. Ver `.widget-enter` en globals.css + `AnimatedWidgets` (server component).

## Comandos útiles

```bash
# TypeScript check (ignora tests)
npx tsc --noEmit 2>&1 | grep -v "__tests__"

# Build local
npm run build

# Dev
npm run dev
```

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/shared/lib/db/schema.ts` | Re-exports de todos los schemas Drizzle |
| `src/shared/lib/db/helpers.ts` | `currentPeriodMonth()`, `parseMonthParam()` |
| `src/shared/lib/billing.ts` | `effectiveBillingMonth()` para tarjetas con fecha de corte |
| `src/auth/queries.ts` | `getUser()` — Supabase session |
| `src/onboarding/queries.ts` | `getUserHousehold(userId)` |
| `src/resumen/month-utils.ts` | `currentMonth()`, `monthToDate()`, `elapsedMonths()` |
| `src/app/globals.css` | Design tokens CSS (dark mode, colores, sombras) |
