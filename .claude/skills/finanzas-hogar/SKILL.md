---
name: finanzas-hogar
description: >
  Convenciones, patrones y estándares del proyecto finanzas-hogar.
  Trigger: Cualquier tarea de código en finanzas-hogar — queries, actions, UI, caching, diseño.
license: Apache-2.0
metadata:
  author: colpyh
  version: "2.0"
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

`getUserHousehold(userId)` vive en `src/household/queries.ts` (movido desde `onboarding/queries.ts` en jul 2026 — lo usan ~30 archivos fuera de onboarding, invertía el grafo de dependencias).

En **Server Actions**, usar el guard centralizado en vez de repetir `getUser()`+`getUserHousehold()`:

```ts
import { requireHousehold } from "@/household/guards";

export async function myAction(rawData: unknown): Promise<{ error?: string }> {
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };   // discriminante ok:boolean, NUNCA `if (auth.error)`
  const { user, household } = auth;
  // ...
}
```

`ok: true | false` como discriminante — con `{ error: string }` el narrowing de TS no descarta un string vacío falsy, así que `if (auth.error)` no angosta el tipo de forma confiable.

En **Pages/queries**, seguir usando el patrón manual (`getUser()` + `getUserHousehold(user.id)`).

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

**Reglas críticas de caching (v2 — tags GRANULARES por dominio, jul 2026):**
- `'use cache'` SIEMPRE dentro del body de la función, nunca a nivel de archivo
- Dominios en `src/shared/lib/cache-tags.ts`: `expenses | payments | cards | categories | income | members` → `hhTag(householdId, domain)`
- **Queries**: `cacheTag(householdId, hhTag(hh, ...dominiosQueLEE))` — el master tag (householdId pelado) va SIEMPRE primero como palanca "invalidar todo". Si la query llama a OTRA función cacheada, debe tagear también los dominios de esa (invalidar el tag interno NO invalida al outer)
- **Tagear TODOS los dominios que la query LEE, incluidos los `leftJoin`/`innerJoin`**: una query de gastos que hace `leftJoin(card)` para leer `closingDay` DEBE tagear `cards`, y una que joinea `expense` para filtrar por `isActive/type` DEBE tagear `expenses`. Omitir el dominio de una tabla leída = dato stale cuando esa tabla cambia (bug real de jul 2026: `getDashboardSummary`/`getCategoryBudgetStatus`/`getAnnualSummary` leían `card.closingDay` sin tagear `cards`). Regla mnemotécnica: **un dominio por cada tabla que aparece en el `from`/`join`**
- **Actions frecuentes**: `updateTag(hhTag(hh, dominio))` SOLO por los dominios que ESCRIBE — nunca el master (era la causa de que cada tap dejara todo el hogar frío)
- **Ops raras de hogar** (rename, add/removeMember, redeemInvite): SÍ usan `updateTag(householdId)` master + `userHouseholdTag`
- NO cachear queries con `search` (input del usuario) — cache pollution
- `revalidatePath` SOLO con la ruta desde donde se invoca la action (refresca la vista actual en el mismo roundtrip). Cross-route es redundante: bajo `cacheComponents` toda navegación dinámica re-fetchea (router cache dynamic=0)
- **Proxy**: fast path sin llamada de red cuando el `expires_at` de la cookie tiene >60s (`session-freshness.ts` — decodifica SIN verificar firma porque solo decide el REFRESH; la autorización real es el `getUser()` de páginas/actions)
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
import { requireHousehold } from "@/household/guards";

export async function myAction(rawData: unknown): Promise<{ error?: string }> {
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { user, household } = auth;

  try {
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
- `export const viewport` REEMPLAZA los defaults de Next (no fusiona): SIEMPRE incluir `width: "device-width"` + `initialScale: 1` explícitos o mobile renderiza a 980px y toda la UI se desborda (pasó al agregar themeColor)
- Leer docs en `node_modules/next/dist/docs/` antes de usar cualquier API nueva

---

## Infraestructura y Performance

- **Supabase**: región **sa-east-1 (São Paulo)** — proyecto ref `gnsxfdbuzpklfkrbqtij`. Migrado desde us-east-1 (Virginia) en jun 2026 para reducir latencia (equipo en Chile).
- **Vercel**: Function Region **gru1 (São Paulo)** — debe coincidir con la región de Supabase. Verificar con header `x-vercel-id` (debe ser `gru1::gru1`, no `gru1::iad1`).
- **API keys Supabase**: formato nuevo `sb_publishable_...` (anon) y `sb_secret_...` (service_role), NO los JWT legacy `eyJ...`. Soportados por supabase-js ≥2.101 y @supabase/ssr ≥0.10.
- **Keep-warm**: `src/app/api/health/route.ts` (`connection()` + `SELECT 1`) existe y está deployado, PERO no hay pinger externo configurado (diferido — nunca se creó cuenta en cron-job.org). Vercel Cron free = 1x/día, inservible para keep-warm. Cold start ~1.2s en el primer request tras inactividad; se decidió no justificarlo para 2 usuarios.
- **Índices DB**: las tablas tienen índices `idx_*` por `householdId` + columnas de filtro. Al agregar tablas/queries nuevas, crear índice por `household_id` (+ `deleted_at` para soft-delete).
- **RLS**: TODAS las tablas public tienen RLS habilitado + policies por hogar (vía función `is_household_member`). Al crear una tabla nueva: habilitar RLS y crear policies, o queda expuesta vía REST API.

### Scripts de DB / migración (node + pg)

- `pg` está en `node_modules` del proyecto (no global) → ejecutar scripts **desde la raíz del proyecto**.
- `.env.local` puede tener credenciales desactualizadas. Para credenciales que funcionan: `vercel env pull /tmp/.env.x --environment=production`.
- Para trabajo de migración/DDL (drizzle-kit push, bulk insert) usar **Session pooler (5432)**, NO Transaction pooler (6543, solo para la app serverless).
- `drizzle-kit push` NO recrea RLS, policies, functions ni triggers — solo tablas/índices/FKs. Migrarlos aparte con `pg_get_functiondef`/`pg_get_triggerdef`/`pg_policies`.

## Modelo de negocio (gotchas críticos)

- **Gastos VARIABLES** (luz, agua): el monto real del mes vive en `fixed_expense_payment.amount`, NUNCA en `expense.amount` (que es 0/default). Y el monto del mes es el **MÁXIMO de los pagos, no la suma** (`variableMonthAmount` en `src/shared/lib/variable-expense.ts`): la fila de settlement (parte del deudor al saldar) es una fracción de la misma boleta — sumarla infla el total 1.5×. Corolario: cualquier query de "gasto por mes" (incl. `getAnnualSummary`) debe sacar fijos+variables de `fixed_expense_payment.amount` por `periodMonth`, NO de un total de fijos constante (deja el gráfico plano y omite los variables). Los ingresos de sueldo se PROPAGAN hacia adelante (último por miembro con `periodMonth <= mes`), no son por mes exacto — replicar `getMonthlyIncome`.
- **Balance entre miembros = ACUMULADO** (no mensual). `getPendingBalances(householdId, memberCount, memberMap, currentUserId)` suma la deuda de TODOS los meses no saldados; persiste hasta saldar por item (expense+mes) con `settleBalanceItem`. Internamente los ítems de deuda están cacheados a nivel hogar (`getHouseholdDebtItems`, `cacheTag(householdId)`); solo el signo del neto y la agrupación se calculan por usuario, post-caché.
  - **Deuda = presencia, no ledger**: un ítem se considera saldado por la PRESENCIA de una fila `paid` en `fixed_expense_payment`, no comparando montos acumulados. Por eso "saldar un monto parcial" NO es soportable hoy sin rediseñar a un modelo de ledger (deuda = acumulado de ítems − acumulado de pagos); "saldar cuenta completa" (`settleAllWithMember`, jul 2026) sí es directo: recorre TODOS los ítems pendientes de una contraparte (mezcla ambas direcciones, cada uno con su propio `debtorId`) e inserta todo en una única transacción atómica — si hay carrera con otro settle, se revierte entero (nunca queda parcialmente saldado). `computeShareAmount` es la lógica de montos compartida entre `settleBalanceItem` (uno) y `settleAllWithMember` (batch).
- **Guard de deuda pendiente**: `pendingDebtGuard(householdId, userId, expenseId, action?)` (`src/balances/guards.ts`) bloquea `deleteExpense`/`deleteFixedExpense` si el gasto tiene meses sin saldar (`action` parametriza el mensaje: default "eliminarlo"); `removeMember` tiene el guard equivalente por miembro. Para **editar** (desmarcar "compartido"/marcar privado) se usa en cambio `getPendingDebtSummary(householdId, userId, expenseId)` — NO bloquea, devuelve `{ totalAmount, debtorNames } | null` para que el caller muestre un `ConfirmDialog` explícito ("¿desmarcar igual? La deuda de $X con [nombre] desaparece del balance") en vez de cortar en seco; `updateExpense`/`updateInstallment`/`updateFixedExpense` aceptan `{ force: true }` como 3er argumento una vez confirmado. El balance solo ve gastos/miembros vivos — cualquier transición a no-compartido/borrado sin este chequeo hace desaparecer deuda en silencio.
- **Cuotas COMPARTIDAS — `installmentsPaid` es DERIVADO, no una columna mantenida** (rediseño jul 2026): para `isShared=true`, `installmentsPaid` NUNCA se lee de la columna ni se incrementa a mano — se calcula en cada lectura con `getSharedInstallmentsPaidCounts(householdId, memberCount)` (`src/shared/lib/db/installments.ts`): `COUNT` de `periodMonth` distintos donde TODOS los miembros tienen fila `paid` en `fixed_expense_payment`. Usar `effectiveInstallmentsPaid(row, sharedCounts)` para resolver el valor a mostrar (deriva si `isShared`, columna si no). El viejo `syncSharedInstallmentCounter` (columna incrementada a mano) se ELIMINÓ — tenía un bug de fondo: `unmarkMyPayment`/`unmarkOtherPayment` borraban filas de `fixed_expense_payment` sin decrementar el contador, sobreconteo permanente. Para cuotas NO compartidas, `installmentsPaid` sigue siendo la columna simple (`markInstallmentPaid`, +1 atómico con `coalesce(...)+1` + condición `< total`, nunca read-modify-write en JS) — ahí no hay "deshacer" que la desincronice.
  - `markAsMonthlyPayer`/`registerInstallmentShare` (`compras/actions.ts`) y `markPaidForOther`/`unmarkOtherPayment` (`gastos-fijos/actions.ts`, reusadas por la UI de compras) aceptan `month?: string` (default mes actual) — la página de Compras tiene su propio `MonthSelector`; sin threadear el mes, el botón siempre pisaba HOY sin importar qué mes se estuviera viendo (no había forma de regularizar un mes pasado olvidado).
  - **`markPaidForOther(expenseId, month?)`** (gastos fijos, jul 2026): registra el pago del OTRO miembro sin depender de un `debtorId` explícito — infiere "el otro" server-side (`members.find(m => m.userId !== user.id)`) y RECHAZA con error si `members.length > 2` (con 3+ hay varios "otros", saldar por deudor se hace en Balances). Conectado en `FixedExpenseCard` en DOS puntos: (a) ya existía para "yo pagué → marcar que el otro también"; (b) desde el estado "nadie pagó todavía" hay un botón separado ("Registrar pago de {nombre}", ícono `Users`, solo si `twoMembers`) que llama la MISMA action sin tocar el `status` propio — nuevo campo `otherMemberName` enhebrado desde `page.tsx` (nombre de la contraparte, disponible aunque nadie haya pagado) para el label. Misma limitación pendiente en Compras → Cuotas compartidas (`installment-card.tsx`, reusa la misma action) si se pide ahí también.
  - `EditInstallmentDialog` muestra `installmentsPaid` de solo lectura cuando `isShared` (ya no es un input editable — evita que el form desincronice el conteo a mano).
- **Compras one_time — estado de pago**: columna `expense.paidAt` (nullable). `isPaid = !cardId || card.kind === "debit" || paidAt != null`. `toggleExpensePaid` valida type=one_time + tarjeta de crédito presente + no borrado.
- **Tarjetas — `card.kind`** (`credit` default | `debit`): débito NO tiene ciclo de facturación — las actions fuerzan `closingDay/paymentDueDay = null` (con eso todas las queries atribuyen al mes calendario y `getCardPaymentsDue` las excluye solas) y sus compras nacen pagadas.
- **Email inbound (BCI)**: correos del banco → **CloudMailin** (proveedor ACTIVO desde jul 2026; filtro de Gmail reenvía los de `bci.cl` a la dirección `...@cloudmailin.net`, formato "JSON Normalized") → webhook `/api/webhooks/email/{householdId}?secret=` → `normalizeInboundPayload` (acepta CloudMailin Y Postmark) → `parseBciEmail` → `pending_expense` + push. Al confirmar, se auto-vincula la tarjeta si hay exactamente UNA activa con esos últimos 4 dígitos y se **sugiere la categoría** por merchant (`suggestCategoryByMerchant` en `email-inbound/queries.ts`: match exacto por descripción normalizada contra el historial, gana la más usada; sin historial no sugiere nada → confirmación en 1 tap). El parser soporta los DOS formatos de BCI (con y sin dos puntos, regexes anclados a inicio de línea); correos BCI que no son compra (transferencias) se descartan como `not_purchase` salvo que el asunto contenga "uso de tu tarjeta".
  - **Secreto por hogar** (jul 2026): `household.webhook_secret` — columna generada por Postgres (`default(sql\`encode(gen_random_bytes(32),'hex')\`)`, pgcrypto), NO env var. Ya NO existe fallback a un `WEBHOOK_SECRET` global (eliminado tras confirmar el corte con CloudMailin) — un hogar inexistente y un secreto equivocado dan la MISMA respuesta 401, sin revelar cuál pasó.
  - **Privacidad del pendiente**: `pending_expense.created_by_user_id` = `household.email_forwarder_user_id` al momento de la ingesta (quién reenvía correos del banco HOY — valor único por hogar, no soporta 2 forwarders simultáneos; si el otro miembro también empieza a reenviar sus propios correos, hay que rediseñar a secreto/URL por-miembro). `listPendingByHousehold`/`getPendingCount` filtran por dueño; `confirmPendingExpense`/`discardPendingExpense` tienen el mismo guard server-side (no solo ocultar en la UI). El modal de confirmar tiene los toggles privado/compartido (antes no existían) — si se marca compartido, siembra el pago del confirmante (mismo patrón que `createPurchase`, ya que un `one_time` no tiene registro mensual como cuotas/fijos).
- **Reparto compartido (N miembros)**: `getPendingBalances` y `getDashboardSummary`/`myShare()` reciben `memberCount` y dividen dinámicamente; el modelo de deuda ya es N-aware (un ítem por deudor). `settleBalanceItem(expenseId, periodMonth, debtorId)` recibe el DEUDOR explícito (valida que sea del hogar) — NUNCA inferir "el otro" con `members.find()` (rompe a 3+). En Balances el neto es POR MIEMBRO y la key de lista es `expenseId-mes-debtorId` (el mismo gasto genera N ítems). Los atajos "saldado por ambos"/"deshacer pago del otro" de gastos fijos se OCULTAN a 3+ (`memberCount > 2`, prop en `FixedExpenseCard`) y las actions `markPaidForOther`/`unmarkOtherPayment` tienen guarda que redirige a Balances. OJO pendiente: el reparto histórico usa el count ACTUAL — meses viejos se recalculan retroactivamente si el hogar crece (persistir reparto por período sigue pendiente).
- **Billing period**: `billingPeriodForMonth` clampea inicio Y fin al largo real del mes (`Math.min(closingDay, últimoDía)`). Sin el clamp del inicio, closingDay=30 + febrero dejaba compras del 1-2 de marzo fuera de todo período.
- **Categorías globales**: `category.householdId` es NULLABLE — `NULL` = categoría de sistema visible para TODOS los hogares (comentario en el schema). Cualquier query que arme un mapa de categorías (nombre, budget) debe filtrar con `or(isNull(category.householdId), eq(category.householdId, householdId))`, NUNCA solo `eq(...)` — un query que omita el `isNull` deja cualquier gasto categorizado con una categoría default mostrando "Sin categoría" (bug real en `resumen/queries.ts::getMonthlySummary`, ya corregido; `categories/queries.ts` sí lo hacía bien desde el principio, usarlo de referencia).
- **Editar privado/compartido después de creado**: `updateExpense` (compras one_time) también acepta `isPrivate`/`isShared` — antes solo se elegían al crear. Al marcar compartido en un `one_time` ya existente, siembra `fixed_expense_payment` (mismo patrón que `createPurchase`); si el `responsibleId` viene `null` explícito en el payload (vs. `undefined` = no tocado), NO hay que arrastrar el responsable anterior con `??` — hay que chequear `!== undefined` para no confundir "sin asignar a propósito" con "campo no enviado".

## Foto de boleta (receipts)

- **Pipeline**: foto comprimida en cliente (canvas 1280px JPEG) → `analyzeReceipt` (server action: extracción + upload en paralelo) → `PurchaseForm` precargado con ítems editables → `createPurchase` con `receiptItems` (jsonb) + `receiptImagePath`.
- **Extractor con IA**: interfaz propia `ExtractedReceipt` (`src/receipts/types.ts`); implementación actual **Gemini free tier** (`src/receipts/gemini.ts`, env `GEMINI_API_KEY`, modelo via `GEMINI_MODEL` default gemini-2.5-flash). Cambiar de proveedor = reemplazar UN archivo. Devuelve null en fallo de datos; lanza SOLO por config faltante.
- **Regla de oro**: el total IMPRESO manda — si `itemsMatchTotal` da false, la UI marca el detalle como "revisar" pero nunca ajusta el total.
- **Storage**: bucket privado `receipts`, path `{householdId}/{uuid}.jpg`, RLS por hogar (`is_household_member` sobre `storage.foldername(name)[1]`). Upload con el cliente AUTENTICADO (regla del proyecto: service client SOLO en webhooks). Display vía signed URL de 1h (`ReceiptDetail`).
- **Compresión compartida**: `compressImage(file, {maxSize, quality})` vive en `src/receipts/lib/compress-image.ts` (canvas → JPEG), reusada por `ReceiptCapture` (boleta, 1280px/0.82 — necesita legibilidad para la IA) y por `PurchaseForm` (imagen simple de respaldo, 1000px/0.72 — sin OCR de por medio, se puede comprimir más).
- **Imagen simple de respaldo (sin IA)**: en el alta manual de "Nueva compra" (`PurchaseForm`, cuando `!receipt` — o sea NO viene del flujo de boleta escaneada), hay un control "Adjuntar imagen (opcional)" que sube una foto cualquiera SIN extracción. Server action `uploadReceiptImage(base64, mimeType)` (`src/receipts/actions.ts`) — solo hace el upload al bucket `receipts` (comparte `validateImage`/`uploadToReceiptsBucket` con `analyzeReceipt`), a diferencia de `analyzeReceipt` trata el fallo de upload como error DURO (no hay ítems/total que rescatar). El path resultante se manda como `receiptImagePath` en `createPurchase` — mismo campo que usa la boleta escaneada, sin schema nuevo. Los dos flujos son mutuamente excluyentes por la presencia del prop `receipt` en `PurchaseForm`.

## Análisis con IA (insights)

- **Feature**: botón "Analizá mis finanzas" en Resumen (`src/insights/components/insights-panel.tsx`) → Server Action `analyzeFinances(month)` (`src/insights/actions.ts`) reúne los datos que la página YA carga (no queries nuevas) → Gemini → titular + 3-5 puntos clasificados (`positivo`/`alerta`/`idea`).
- **Patrón Gemini reutilizable** (idéntico a receipts): `src/insights/gemini.ts` — `fetch` a `generativelanguage.googleapis.com`, `responseSchema` JSON estructurado, `GEMINI_API_KEY` + `GEMINI_MODEL` (default gemini-2.5-flash). Interfaz propia (`FinancialInsights` en `types.ts`) → cambiar de proveedor = reemplazar UN archivo. Devuelve null en fallo; lanza SOLO por config faltante.
- **Bajo demanda, NO automático**: cuida cuota del free tier y no bloquea el render (~2-4s). Efímero (sin persistencia). Corte previo: si el mes no tiene datos, ni se llama a la IA.
- **Privacidad**: solo viajan números + nombres de categorías/cuotas — NUNCA nombres de miembros ni de comercios. Mismo criterio que el OCR (que ya manda imágenes).

## Patrones de UI

- **Botón interactivo dentro de un `<Link>`**: el handler DEBE hacer `e.preventDefault()` + `e.stopPropagation()` en un client component, sino el click también navega (ej. `repeat-purchase-button.tsx`).
- **Forms que crean registros**: guard SINCRÓNICO contra doble-submit (`submittingRef` — el `disabled` por estado llega tarde ante doble tap en mobile y duplica el gasto) + tras guardar navegar AL MES del registro (`/compras?month=...`), no al mes actual — una boleta vieja caía en otro mes, el usuario no la veía y reintentaba.
- **Optimistic UI (convención para interacciones frecuentes)**: cerrar diálogo + reflejar el resultado AL TAP; la action corre en `startTransition` detrás; en error → revertir + `toast.error`. El override optimista vive en estado local y se RESETEA con `useEffect` cuando las props del servidor re-sincronizan (dejarlo aplicado duplica el efecto). Ejemplos: `purchase-paid-status`, `settle-button`, `installment-card`, `fixed-expense-card`, `pending-expense-list`.
- **PWA**: `src/app/manifest.ts` (standalone, start /dashboard) + íconos generados con `node scripts/generate-icons.mjs` (PNG sin deps) + `appleWebApp` en layout. Instalar desde SAFARI → pantalla completa. El webview embebido de otras apps (Gmail/Google, se reconoce por la ✕ superior) descarta cookies y "cierra la sesión" — no es bug, es el webview. Los `shortcuts` del manifest (mantener presionado el ícono → Nuevo gasto/Pendientes/Balances) se cachean al INSTALAR → cambios requieren reinstalar la PWA.
- **Gesto "sacudir para nuevo gasto"**: opt-in en Ajustes→Gestos (`shake-toggle.tsx`), `ShakeListener` global en `(app)/providers.tsx` (pref en localStorage `finanzas:shakeToAction` + evento `finanzas:shake-pref-changed`, ver `shared/lib/shake.ts`). iOS exige `DeviceMotionEvent.requestPermission()` desde gesto de usuario → se pide en el toggle. **LÍMITE WEB (no reintentar):** una PWA NO puede detectar movimiento/golpes con la app CERRADA (sin proceso en segundo plano, sin hooks del SO) — "golpear para abrir" es imposible. Los sensores solo se leen con la app abierta en primer plano. Alternativa física = sticker NFC con la URL.
- **Páginas con datos de ejemplo (mocks)**: usar `getSessionUser()` (`src/auth/queries.ts`) — devuelve null SOLO sin sesión. NUNCA envolver las queries reales en try/catch vacío: un error real debe ir al error boundary, no mostrar cifras falsas como reales.
- **Moneda**: SIEMPRE `formatCurrency` de `currency-display.tsx` — nada de `toLocaleString` ad-hoc. Default de schema: CLP.
- **Listas colapsables**: `INITIAL_VISIBLE` + estado `expanded` + botón "Ver más/todas" (dashboard widgets, categorías en ajustes).
- **Animaciones de entrada**: CSS puro (`@keyframes` + `animation-delay`), NO librerías de animación. Ver `.widget-enter` en globals.css + `AnimatedWidgets` (server component).

## Testing

- Sin BD de test real — todo se testea mockeando `@/shared/lib/db` (`jest.mock`). Para verificar que una query REALMENTE filtra por la columna correcta (no solo que el mock fue llamado), capturar la condición real que la query arma con `eq`/`and` de drizzle-orm (SIN mockear esas funciones) y convertirla a SQL con `new PgDialect().sqlToQuery(condition)` (`drizzle-orm/pg-core`) — permite `expect(sql).toContain('"tabla"."columna" = $')` y `expect(params).toContain(valor)`. Ver `__tests__/integration/household-isolation.test.ts` (builder mock encadenable `from/where/limit/...` que devuelve un thenable).
- Tras escribir un guard/filtro de seguridad o de integridad de datos, verificar con un **test de mutación**: comentar/revertir la línea del fix, correr el test, confirmar que FALLA, y recién ahí restaurar. Evita tests vacuos que pasan sin importar el código real.
- `cacheTag()` de `next/cache` TIRA ERROR si se llama fuera de un contexto real de "use cache" (chequea `process.env.__NEXT_USE_CACHE`) — cualquier test que importe (aunque sea indirectamente) una función con `'use cache'` necesita `jest.mock("next/cache", () => ({ cacheTag: jest.fn() }))`.

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
| `src/household/queries.ts` | `getUserHousehold(userId)`, `getHouseholdMembers` |
| `src/household/guards.ts` | `requireHousehold()` — guard combinado auth+household |
| `src/shared/lib/db/installments.ts` | `getSharedInstallmentsPaidCounts`, `effectiveInstallmentsPaid` |
| `src/resumen/month-utils.ts` | `currentMonth()`, `monthToDate()`, `elapsedMonths()` |
| `src/app/globals.css` | Design tokens CSS (dark mode, colores, sombras) |
