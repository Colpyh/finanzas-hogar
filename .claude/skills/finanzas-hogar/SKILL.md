---
name: finanzas-hogar
description: >
  Convenciones, patrones y estándares del proyecto finanzas-hogar.
  Trigger: Cualquier tarea de código en finanzas-hogar — queries, actions, UI, caching, diseño.
license: Apache-2.0
metadata:
  author: colpyh
  version: "1.0"
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
- `<Suspense fallback={null}>` en root layout — next-themes requiere cookies server-side
- `use cache` functions NO pueden llamar `cookies()`, `headers()`, `searchParams` directamente
- Leer docs en `node_modules/next/dist/docs/` antes de usar cualquier API nueva

---

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
