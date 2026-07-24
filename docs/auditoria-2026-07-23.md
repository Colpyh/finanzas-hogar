# Auditoría técnica — finanzas-hogar
**8 agentes especializados · hallazgos críticos/altos verificados adversarialmente contra el código**
_App Next.js 16 + Drizzle + Supabase · ~18k LOC · en producción con usuarios reales_

---

# Resumen ejecutivo

`finanzas-hogar` es una app **madura y bien pensada** para su dominio (finanzas de pareja/hogar). Fundamentos sólidos: arquitectura feature-first consistente, separación read/write (CQRS de facto), cliente de DB lazy/memoizado bien razonado para serverless, validación Zod en las fronteras, autenticación robusta con `getUser()` (valida el token contra el servidor de auth, no solo lee la cookie), tagging de caché granular **impecable** (revisadas ~18 queries cacheadas, cero tags faltantes) y patrones atómicos correctos donde importan (contador de cuotas con SQL `coalesce+1`, idempotencia de ingesta con hash).

Los dos frentes que exigen acción **hoy** son:
1. **Fuga de privacidad** (🟠): el toggle "Gasto privado — Solo tú lo verás" solo se respeta en la lista de compras y su detalle, pero **no** en gastos-fijos, dashboard, resumen, balances ni en los agregados por categoría que alimentan la IA. Rompe una promesa explícita de la UI con cliente real.
2. **Deuda que desaparece al editar** (🟠, roza 🔴): destildar "Gasto compartido" en una cuota con deuda impaga la borra del balance **en silencio** — el borrado tiene guard (`pendingDebtGuard`), la edición no. Alcanzable hoy vía el diálogo de editar cuota.

El resto es **deuda de mantenibilidad** (duplicación de lógica de negocio crítica, boilerplate de auth repetido) e **inconsistencias entre formularios gemelos**. Tres hallazgos de integridad de datos son reales pero **LATENTES**: solo se disparan con 3+ miembros y el hogar en producción es de 2. La verificación adversarial **refutó** el hallazgo estrella sobre RLS y **degradó** dos hallazgos "alto" de arquitectura a deuda cosmética. **No hay pérdida de datos ni fuga entre hogares confirmada.**

| Dimensión | Puntaje | Justificación |
|---|---|---|
| **Calidad de código** | 7/10 | Base alta (TS strict, Zod, CQRS, decisiones de dominio documentadas), lastrada por duplicación de reglas de negocio y algo de código muerto. Sin defectos críticos de calidad. |
| **Seguridad** | 6/10 | Auth y aislamiento multi-tenant disciplinados, webhook bien endurecido; pero fuga de privacidad CONFIRMADA + frentes medios (secreto de webhook global, service-role en request path, CSV injection). |
| **Mantenibilidad** | 6/10 | Estructura consistente, pero la lógica más crítica (reparto de share, guard de auth, manejo de constraint) duplicada en 4–50 sitios; `getUserHousehold` invirtió el grafo de dependencias. |
| **Consistencia** | 6/10 | Formularios gemelos que divergen (toggles, copy, post-guardado), contrato `throw` vs `{error}` mezclado, h1 equivocado, dos formatos de "mes actual", locales de fecha mixtos, defaults contradictorios (ARS vs CLP). |
| **Rendimiento** | 7/10 | Caching ejemplar y páginas sin waterfalls a nivel app; el lever principal es de infraestructura: `pool.max:1` serializa los `Promise.all` a nivel DB. Overfetch puntual. |
| **Integridad de datos** | 6/10 | Buenos patrones atómicos y guards de borrado; pero la edición de `isShared` no tiene guard (deuda desaparece) y hay bordes de recuento del contador y del monto variable que muerden con 3+ miembros. |

---

# Hallazgos por agente

## Agente 1 — Arquitectura
La arquitectura feature-first está bien intencionada y en general respetada, con schema limpio y normalizado, cliente de DB lazy/memoizado muy bien razonado para serverless, y cache-tags granular por dominio. El problema es que el grafo de dependencias no es del todo limpio: `getUserHousehold` (pieza fundacional de auth) vive dentro de `onboarding`, y falta la abstracción de guard de auth.

**Fortalezas:**
- Separación read/write limpia: ningún `queries.ts` contiene `db.insert/update/delete`; las mutaciones viven solo en `actions.ts`. CQRS de facto.
- Cliente de DB lazy y memoizado vía Proxy, con razonamiento documentado y correcto para Vercel serverless.
- Schema limpio y normalizado: todas las tablas referencian household, sin god-schema, re-export centralizado para drizzle-kit.
- Cache-tags granular por dominio con `CacheDomain` tipado y reglas documentadas (tagear lo que se LEE, invalidar lo que se ESCRIBE).
- Decisiones de dominio no obvias documentadas en el código (`variableMonthAmount` usa MÁXIMO; `effectiveBillingMonth` con ejemplos).
- Estructura feature-first consistente en 17 features con el mismo layout, alias `@/*` único.

**Hallazgos:**
- 🟡 [VERIFICADO · alto→medio] **`getUserHousehold` vive dentro de la feature `onboarding`** — `src/onboarding/queries.ts:38` — 28 archivos importan de `@/onboarding/queries`; una feature de flujo se volvió el núcleo del que depende todo. Sin impacto funcional; deuda de organización con fix mecánico. → mover a `household` o `shared/lib/auth`.
- 🟢 [VERIFICADO · alto→bajo] **"Dependencias bidireccionales" entre features** — `src/balances/actions.ts:11` — el "ciclo" solo aparece colapsando cada carpeta en un nodo; los módulos concretos importados son hojas sin re-import → el grafo real es acíclico. Cosmético.
- 🟡 **Falta abstracción de guard de auth: boilerplate repetido ~50 veces** — `src/compras/actions.ts:16` — el trío `getUser → getUserHousehold → if(!household)` copiado en ~12 actions; el contrato de seguridad más crítico, duplicado. → `requireHousehold()`.
- 🟡 **Errores de negocio con `throw` en actions invocadas desde UI** — `src/email-inbound/actions.ts:43` — `confirmPendingExpense` es `Promise<void>` y no puede devolver error; viola la convención; Next redacta el mensaje en prod y dispara el error boundary.
- 🟡 **Utilidades de fecha/mes fragmentadas en 3 ubicaciones** — `src/resumen/month-utils.ts:30` — coexisten `currentPeriodMonth()`→`YYYY-MM-01` y `currentMonth()`→`YYYY-MM`; footgun de formato.
- 🟢 **`CategoryBudgetStatus` definido en `dashboard`, no en `categories`** — `src/categories/queries.ts:6` — ownership de tipo invertido (`import type`, inocuo en runtime).
- 🟢 **Dos raíces de utilidades: `src/lib` vs `src/shared/lib`** — `src/lib/utils.ts:5` — 19 imports vs 56; `src/lib` queda como cajón huérfano de 6 LOC.

## Agente 2 — Bugs funcionales
Vistas y formularios bien construidos (guards anti doble-submit, UI optimista con reversión). El hallazgo más serio es de privacidad; también hay un `{error}` de borrado descartado en silencio, la posibilidad de crear gastos compartidos+privados, y un catch demasiado amplio que muestra mock a usuarios reales.

**Fortalezas:**
- Guard sincrónico contra doble-submit con `useRef` (`submittingRef`), que cubre el gap del re-render de React.
- UI optimista con reset del override vía `useEffect` cuando el servidor re-sincroniza props.
- `markInstallmentPaid` usa UPDATE atómico condicionado (`< total`), evitando la race de incrementos concurrentes.
- Validación de defaults defensiva contra la lista real (`categories.some/members.some/cards.some`) antes de aplicar localStorage.
- `pendingDebtGuard` protege contra soft-borrar gastos compartidos con meses sin saldar.

**Hallazgos:**
- 🟠 [VERIFICADO] **El toggle "Gasto privado" no se respeta fuera de la lista de compras** — `src/gastos-fijos/queries.ts:10`, `src/dashboard/queries.ts:240` — `getActiveFixedExpenses` no filtra `isPrivate`; los montos privados se suman en dashboard/resumen; `getRecentPurchases` duplica el SELECT sin el predicado y muestra la descripción. La promesa "Solo tú lo verás" es falsa.
- 🟡 **`DeleteExpenseButton` descarta el `{error}` en silencio** — `src/compras/components/delete-expense-button.tsx:19-24` — [VERIFICADO] en el branch de error hace `setOpen(false)` sin toast; el gasto sigue ahí sin explicación (y `deleteExpense` devuelve errores legítimos: falta de permiso y `pendingDebtGuard`).
- 🟡 **Se puede crear un gasto compartido Y privado a la vez** — `src/compras/types.ts:29` — solo `createPurchaseSchema` tiene el `.refine()`; installment/fixed no. Genera deuda en Balances que el deudor no puede rastrear (oculto en su lista y `notFound` en detalle).
- 🟡 **Varias Server Actions hacen `throw` en vez de `{error}`** — `src/compras/actions.ts:16` — `createPurchase/createInstallment/updateExpense/createFixedExpense`; Next redacta el mensaje en prod → texto opaco.
- 🟡 **Ajustes muestra datos MOCK a un usuario real ante cualquier error de DB** — `src/app/(app)/ajustes/page.tsx:86` — el `catch {}` vacío atrapa TODO; un timeout transitorio muestra `MOCK_MEMBERS` ("Matías (tú)", "Cónyuge") e `isOwner=true`.
- 🟢 **No se puede poner en 0/limpiar el presupuesto de una categoría** — `src/categories/components/category-manager.tsx:128` — `Number(budget) || undefined` colapsa `''` y `'0'` a `undefined`.
- 🟢 **La fecha por defecto usa UTC (`toISOString`)** — `src/compras/components/purchase-form.tsx:55` — en Chile de noche pre-carga la fecha de mañana; a fin de mes el gasto cae en el bucket equivocado.
- 🟢 **`MarkPaidDialog`: el estado `loading` nunca se activa (dead code)** — `src/gastos-fijos/components/mark-paid-dialog.tsx:42` — botones sin feedback.

## Agente 3 — Seguridad
Base sólida: autenticación que valida el token, filtrado por `household.id`, validación Zod, cero `dangerouslySetInnerHTML`, sin SQL injection y un webhook bien endurecido. El hallazgo estrella sobre RLS fue **REFUTADO**.

**Fortalezas:**
- `getUser()` usa `supabase.auth.getUser()` (valida contra el servidor de auth), no `getSession()`, en pages/actions/route handlers.
- Aislamiento multi-tenant disciplinado: cada query filtra por `household.id`; las mutaciones verifican pertenencia antes de escribir.
- Validación server-side con Zod + `safeParse` con errores tipados en route handlers.
- Sin superficie XSS clásica; todo `sql\`\`` interpola referencias de columna o constantes, nunca input de usuario.
- Webhook de email endurecido: comparación de secreto en tiempo constante, tope de payload 1MB, idempotencia por SHA-256, sin filtrar payload crudo en logs.
- Service client aislado (`server-only`, solo en el webhook); la cartola se descifra en el cliente, la contraseña bancaria nunca llega al servidor.

**Hallazgos:**
- ❌ [REFUTADO] **"RLS no protege el camino real de datos"** — `src/shared/lib/db/index.ts:44` — La mecánica es correcta (Drizzle sobre `pg.Pool` hace bypass de RLS), pero la conclusión es FALSA: Supabase expone PostgREST con la `ANON_KEY` pública, donde `auth.uid()` sí funciona y RLS bloquea el acceso anónimo/cruzado. El modelo de dos capas (RLS para REST/Storage + filtro app para Drizzle) es intencional y documentado. Queda solo un grano de verdad de severidad baja (tests de aislamiento).
- 🟠 [VERIFICADO] **El "gasto privado" se filtra en los agregados: fuga de montos y categorías** — `src/resumen/queries.ts:52` — `getMonthlySummary` no recibe `userId` y suma `one_time` privados por household (cacheado, idéntico para todos); `byCategoryMap` agrega montos privados; `insights/actions.ts:31` pasa el total a Gemini. Mismo root que el hallazgo de bugs. → propagar `or(isPrivate=false, createdBy=userId)`.
- 🟡 **Un gasto privado+compartido expone descripción y monto en balances** — `src/balances/queries.ts:53` — `getHouseholdDebtItems` filtra `isShared=true` pero no `isPrivate`; emite `exp.description`.
- 🟡 **Secreto de webhook único y global para todos los hogares** — `src/app/api/webhooks/email/[householdId]/route.ts:16` — un solo `WEBHOOK_SECRET` + `householdId` en el path; quien conozca el secreto puede inyectar `pending_expense` en cualquier hogar cambiando el UUID. → HMAC/token por hogar.
- 🟡 **Clave service-role (Auth Admin API) en contexto de usuario, lista TODOS los usuarios** — `src/shared/lib/supabase/admin.ts:37` — `listUsers({ perPage: 1000 })` en el render de páginas; llave privilegiada fuera de webhooks + problema de escala. → persistir `display_name` en `household_member`.
- 🟢 **CSV injection (fórmulas) en el export** — `src/app/api/compras/export/route.ts:7` — `escapeCsvField` no neutraliza `= + - @` iniciales; `=HYPERLINK(...)` se exporta tal cual. → prefijar comilla simple.
- 🟢 **Página de invitación usa `getSession()` (JWT no revalidado)** — `src/app/invite/[token]/page.tsx:12` — inconsistente; solo gatea la preview (la redención usa `getUser()`).

## Agente 4 — Consistencia funcional
Base sólida y componentes compartidos bien pensados (`ConfirmDialog`, `EmptyState`, `CardPills`, patrón optimista prolijo). Pero hay inconsistencias reales entre formularios gemelos y entre módulos: el contrato de errores se aplica a medias, los toggles se comportan distinto, hay copy contradictorio y un h1 equivocado en producción.

**Fortalezas:**
- Patrón optimista ejemplar y consistente en `installment-card`, `fixed-expense-card`, `purchase-paid-status`: cierran al tap, revierten con `toast.error`, re-sincronizan con el servidor vía `useEffect`.
- Contrato `{error?}` + `toast.error` correctamente aplicado en TODA la familia de acciones de toggle/pago.
- `ConfirmDialog` reutilizado en 14 lugares con props uniformes; `EmptyState` compartido.
- `formatCurrency` centralizado (sin decimales para CLP) y reutilizado casi en todos lados.

**Hallazgos:**
- 🟠 [VERIFICADO] **h1 "Tarjeta" en la pantalla de Compras** — `src/app/(app)/compras/page.tsx:219` — el `<h1>` dice `Tarjeta`, pero el `metadata.title` es "Compras", las tabs son "Compras"/"Cuotas" y el CTA lleva a "Nueva compra". Título visible y equivocado en una pantalla central. → cambiar a "Compras".
- 🟠 [VERIFICADO] **Contrato de errores mixto: creación/edición hacen `throw`** — `src/compras/actions.ts:19,66,228`, `src/gastos-fijos/actions.ts:22,48` — mientras `updateInstallment/deleteExpense/toggleExpensePaid` devuelven `{error}`, estas 5 lanzan; los forms las envuelven en `try/catch` y muestran `err.message`, que en prod Next redacta → "An error occurred in the Server Components render…".
- 🟠 [VERIFICADO] **`DeleteExpenseButton` se traga el error sin feedback** — `src/compras/components/delete-expense-button.tsx:19-24` — contrasta con `edit-fixed-expense-form.tsx:64` (inline) y `fixed-expense-card.tsx:118` (`toast.error`).
- 🟠 [VERIFICADO] **Toggles privado/compartido: excluyentes en un form, independientes en los otros** — `purchase-form.tsx` (excluyentes) vs `installment-form.tsx:200,217` y `fixed-expense-form.tsx:163,178` (independientes) — en cuotas y fijos se puede guardar `isPrivate=true` + `isShared=true`, estado contradictorio; las actions persisten ambos sin validar.
- 🟠 [VERIFICADO] **Copy de "Gasto compartido" hardcodeado a 2 miembros** — `installment-form.tsx:208`, `fixed-expense-form.tsx:169`, `edit-installment-dialog.tsx:113` — "Se divide entre los dos" vs el genérico correcto de `purchase-form.tsx:321`; el reparto real usa `/ members.length`, no `/2`.
- 🟡 **El mismo error "sin hogar" tiene 4 textos + voseo/tuteo mezclado** — `compras/actions.ts:19` vs `:308`, `tarjetas/actions.ts:16`, etc. — conviven `"No household"` (inglés), `"No tenés…"` (voseo), `"No tienes…"` (tuteo). → dialecto único (tuteo para audiencia chilena) + string canónico.
- 🟡 **Locale de fechas mixto: `es-CL` ad-hoc vs `es-419` del componente compartido** — `date-display.tsx:9` (es-419) vs `purchase-card.tsx:30`, `balances/page.tsx:122` (es-CL) — muchos componentes esquivan `DateDisplay`/`formatDate` con `toLocaleDateString("es-CL")` inline.
- 🟡 **`currentMonth()` (YYYY-MM) en Resumen vs `currentPeriodMonth()` (YYYY-MM-01) en el resto** — `resumen/page.tsx:59` vs `helpers.ts:16` — el mismo `?month=` tiene dos formatos incompatibles entre rutas; un deeplink de mes no es portable.
- 🟡 **Default de moneda: `ARS` en gastos, `CLP` en ingresos** — `expense.ts:36` vs `income.ts:26` — latente (los forms mandan CLP explícito) pero inconsistente entre tablas hermanas.
- 🟡 **UX divergente entre los dos forms de edición gemelos** — `edit-expense-form.tsx` (se queda, muestra "Cambios guardados", sin Cancelar/Eliminar) vs `edit-fixed-expense-form.tsx` (navega, ofrece Cancelar + Eliminar).
- 🟢 **Detalles menores de copy/orden entre gemelos** — orden de toggles invertido, `confirmText` "Sí, eliminar" vs "Eliminar", guía de EmptyState distinta.
- 🟢 _(nota)_ **Faltan `loading.tsx`** en `ingresos`, `ajustes`, `gastos-pendientes` (sí lo tienen compras/dashboard/resumen/balances/gastos-fijos).

## Agente 5 — UX
UX sorprendentemente pulida (optimista consistente, guard anti doble-submit, memoria de últimos valores, lectura de boleta con fallback, FAB con safe-area). Los problemas son de FEEDBACK y CONSISTENCIA entre formularios gemelos.

**Fortalezas:**
- Patrón optimista consistente con reversión + `toast.error`.
- Memoria de últimos valores (categoría/tarjeta/responsable) en localStorage para la compra repetitiva.
- Flujo de boleta con degradación elegante: si la IA falla, "Otra foto" + form manual conservando el comprobante.
- Ocultamiento N-aware de atajos "pagar por el otro" con 3+ miembros.
- Estados vacíos con tono humano; categoría sugerida por historial pre-seleccionada.
- FAB por encima del bottom-nav con `env(safe-area-inset-bottom)` y `aria-label`.

**Hallazgos:**
- 🟡 **Botones de acción con el mismo glifo ✓ para 5+ acciones distintas** — `src/gastos-fijos/components/fixed-expense-card.tsx:222` — diferenciadas solo por color y `title` (invisible en touch); acciones que mueven plata indistinguibles. → label textual corto.
- 🟡 **Toggles "privado"/"compartido" NO mutuamente excluyentes en cuotas/fijos** — `installment-form.tsx:198` — (mismo que Agente 4).
- 🟡 **Eliminar un gasto que falla cierra el diálogo sin feedback** — `delete-expense-button.tsx:16` — (mismo que Agentes 2 y 4).
- 🟡 **`createPurchase/createInstallment` lanzan excepción en vez de `{error}`** — `compras/actions.ts:16` — (mismo que Agentes 1, 2, 4).
- 🟢 **Copy "Se divide entre los dos" asume hogar de 2** — `installment-form.tsx:208`.
- 🟢 **`mark-paid-dialog`: `loading` nunca se activa** — `mark-paid-dialog.tsx:42`.

## Agente 6 — Performance
Estado SÓLIDO. La disciplina de `'use cache'` + `cacheTag` es ejemplar: las ~18 funciones cacheadas taguean correctamente todos los dominios que leen, incluidos los `leftJoin`/`innerJoin` (cero riesgo de stale por ese lado). Las páginas ya usan `Promise.all`. El lever real es de INFRAESTRUCTURA, no del código de negocio.

**Fortalezas:**
- Tagging de caché impecable (verificadas las 18 queries): master tag + cada dominio leído incl. joins.
- Cliente DB lazy y memoizado: páginas estáticas no abren pool; `DATABASE_URL` mal seteada no crashea todas las rutas.
- `getUser`/`getUserHousehold` envueltos en `cache()` de React → dedup entre layout y page en el mismo render.
- `AnimatedWidgets` es RSC con animación CSS pura (cero JS de cliente); charts hechos a mano (sin `recharts` en el bundle).
- `listPendingByHousehold` excluye `rawPayload` (jsonb pesado) explícitamente.

**Hallazgos:**
- 🟠 [VERIFICADO] **Pool `max: 1` serializa TODOS los `Promise.all` a nivel DB** — `src/shared/lib/db/index.ts:47` — con una sola conexión, N queries en `Promise.all` se encolan de a una (la primera toma la conexión, corre, libera, recién ahí la segunda). En cold cache el dashboard encola ~8 funciones cacheadas en serie; bajo concurrencia, `connectionTimeoutMillis:5000` puede disparar 500. **Matiz:** es un tradeoff de tuning, no un bug — el propio comentario recomienda el pooler transaction-mode (6543), que multiplexa y permite subir `max` a 3-5 con seguridad. → subir `max` y medir con carga real.
- 🟡 **Overfetch: `select()` sin proyección en hot paths** — `balances/queries.ts:53,67`, `gastos-fijos/queries.ts:13` — `db.select().from(expense)` trae TODAS las columnas incl. `receiptItems` (jsonb) que nunca se usa; en balances el `innerJoin` trae la fila de expense duplicada. → proyectar columnas explícitas (como ya se hace en `getRecentPurchases`).
- 🟡 **Scans redundantes de `expense` en el dashboard** — `dashboard/queries.ts` — `getAllFixedPaymentsForPeriod` se ejecuta dos veces (dentro de `getDashboardSummary` y de `getFixedExpenseStatusThisMonth`); combinado con `max:1` → ~12 SELECTs en serie en cold cache. **Matiz:** tradeoff deliberado por caché granular reusable; con caché warm el costo desaparece → priorizar solo si el cold-load molesta.
- 🟡 **`getRecentPurchases` trae ventana de 3 meses para devolver 5 filas** — `dashboard/queries.ts:240-270` — trae todos los `one_time` de 3 meses, filtra en JS por mes efectivo y recién ahí `slice(0,5)`. Aceptable al volumen actual; limitar en SQL si crece.
- 🟢 **`getPendingCount` sin caché y secuencial en el layout de toda la app** — `app/(app)/layout.tsx:53` — se `await`ea en cada navegación tras `getUser → getUserHousehold`, sin `'use cache'`. → cachear con tag propio (`hhTag(hh,"pending")`) invalidado por el webhook y confirm/discard.
- 🟢 **`"use client"` innecesario en `BudgetProgress`** — `src/resumen/components/budget-progress.tsx:1` — 100% presentacional (sin hooks/handlers/browser APIs); comparar con `InstallmentProgress` que hace lo mismo y es RSC. → borrar la directiva.
- 🟢 **Faltan índices en `expense.expenseDate` e `expense.isShared`** — `db/schema/expense.ts:75-87` — nulo al volumen actual; monitorear con `EXPLAIN` si la tabla crece. No tocar ahora.

## Agente 7 — Calidad del código
Calidad general alta para ~18k LOC. Los problemas se concentran en DUPLICACIÓN de lógica de negocio no centralizada (reparto de share, boilerplate de auth, constraint única, transporte Gemini) y algo de código muerto. Sin hallazgos críticos.

**Fortalezas:**
- Abstracción de proveedor IA intencional y documentada: cada `gemini.ts` expone solo una forma de dominio; cambiar de proveedor = reemplazar un archivo.
- Buen uso de helpers locales (`myShare()`, `CardFields` compartido).
- Filtrado consistente por `householdId` + `isNull(deletedAt)` y verificación de pertenencia antes de escribir.
- TypeScript strict; Zod en fronteras; contrato `{error?}` respetado en la mayoría de acciones.

**Hallazgos:**
- 🟡 **`markAsMonthlyPayer` y `registerInstallmentShare` son funciones idénticas** — `src/compras/actions.ts:132` — ~45 líneas byte-a-byte iguales salvo el mensaje de error. → `registerSharedInstallmentPayment(expenseId, { conflictMessage })`.
- 🟡 **Boilerplate de auth repetido en ~40 acciones** — `src/gastos-fijos/actions.ts:20` — `throw new Error("No household")` 22 veces; mezcla contratos. → `requireHousehold()`.
- 🟡 **Cálculo del reparto (`share = monto / miembros`) disperso en 10 sitios** — `src/compras/actions.ts:44` — dos formas (number vs `.toFixed(2)`); un cambio de regla obliga a editar 10 lugares. → `splitShare()`/`splitShareForDb()`.
- 🟢 **Manejo de la unique constraint por matching de string 4 veces** — `src/compras/actions.ts:163` — `msg.includes("uq_expense_period_user")`; frágil. El repo ya usa `err.code` en el webhook. → `isUniqueViolation(err)` con `err.code === '23505'`.
- 🟢 **Columna `ownerId` del schema `expense` es código muerto** — `src/db/schema/expense.ts:25` — nunca se lee ni escribe; la privacidad se implementó con `isPrivate` + `createdBy`. Comentario desactualizado y trampa.
- 🟢 **Default de moneda `'ARS'` en app chilena** — `src/db/schema/expense.ts:36` — (mismo que Agente 4).
- 🟢 **Boilerplate de transporte Gemini duplicado en 3 archivos** — `src/receipts/gemini.ts:53` — misma infra fetch+parseo. → `callGemini<T>()` en shared.
- 🟢 **`CurrencyDisplay` y `DateDisplay` exportados pero nunca usados** — `src/shared/components/currency-display.tsx:19` — solo se importan las funciones `formatCurrency`/`formatDate`.

## Agente 8 — Integridad de datos
El modelo maneja bien las rarezas intencionales (MAX en variables, balance acumulado N-aware, soft-delete filtrado, incremento atómico del contador). Los problemas están en los BORDES: la edición de `isShared` no tiene el guard que sí tiene el borrado, y hay recuentos que muerden con 3+ miembros.

**Fortalezas:**
- Incremento del contador de cuotas SQL atómico y acotado (`coalesce(...)+1` con `WHERE … < total`) en `markInstallmentPaid` y `syncSharedInstallmentCounter`.
- `confirmPendingExpense` envuelve el insert de `expense` + flip de `pending` en `db.transaction`. El patrón atómico existe y se aplica bien acá.
- `pendingDebtGuard` (borrado) y el guard de `removeMember` cierran correctamente el borrado de deuda no saldada.
- Soft-delete filtrado consistentemente (`isNull(deletedAt)`) en balances/dashboard/resumen/tarjetas.
- Idempotencia sólida en ingesta: webhook con `payload_hash` + `maybeSingle`, cartola con `onConflictDoNothing`.

**Hallazgos:**
- 🟠 [VERIFICADO · roza 🔴 · ALCANZABLE HOY] **Editar `isShared`→false borra la deuda pendiente sin guard** — `src/compras/actions.ts:243-254` (`updateInstallment`) vía `edit-installment-dialog.tsx:103-118` — el borrado está protegido por `pendingDebtGuard`, pero la edición no. `getHouseholdDebtItems` filtra `isShared=true`, así que destildar "Gasto compartido" en una cuota con un mes impago hace desaparecer toda esa deuda del balance en silencio. **Verificado alcanzable** vía el diálogo de editar cuota (el toggle está expuesto y `updateInstallment` escribe `isShared` sin guard). _Calibrado a 🟠 y no 🔴 porque es recuperable (las filas de pago persisten; re-marcar compartido la restaura) y requiere una edición deliberada sobre un gasto con deuda previa._ **Para gastos fijos es LATENTE**: `updateFixedExpense` acepta `isShared` en el schema, pero `edit-fixed-expense-form.tsx:46-52` no lo envía → no alcanzable por UI hoy. → llamar `pendingDebtGuard` antes del update cuando `isShared` pasa a false.
- 🟠 [VERIFICADO · LATENTE (3+ miembros)] **`installmentsPaid` recuenta un mes ya cerrado al crecer el hogar** — `src/compras/installment-sync.ts:31-52` — `syncSharedInstallmentCounter` incrementa cuando `paidRows >= memberCount` (count ACTUAL) sin registrar qué meses ya contó. Un mes cerrado a 2/2 (contador +1) vuelve a "incompleto" al pasar a 3 miembros; al saldar ese mes viejo, `paidRows`=3/3 e incrementa de nuevo → sobre-cuenta. Como todo filtra `installmentsPaid < installmentsTotal`, la cuota se muestra "terminada" mientras aún se debe. **No afecta al hogar de 2 en producción**; se dispara con crecimiento del hogar (ligado al pendiente conocido "el reparto histórico usa el count actual"). _Variante sin crecimiento:_ `unmarkMyPayment`/`unmarkOtherPayment` borran un pago pero no decrementan el contador. → derivar el contador de `COUNT(DISTINCT periodMonth)` de meses completos.
- 🟠 [VERIFICADO · LATENTE (3+ miembros)] **El monto del variable en Balances no usa MAX** — `src/balances/queries.ts:107-116` y `balances/actions.ts:43-54` — toma `paidPayments[0].amount` / `.limit(1)` sin `ORDER BY` ni `variableMonthAmount` (el MAX que sí usa el dashboard, `dashboard/queries.ts:101`). Con 3+ miembros y liquidación parcial, el "primer pago" puede ser la fracción de settlement → sub-cobra la deuda del siguiente deudor. **Latente con 2 miembros** (en la ventana de deuda hay un solo pago = boleta completa, correcto). → usar `variableMonthAmount(...)` en ambos lugares.
- 🟡 **`createPurchase` no es atómico: expense + primer pago fuera de transacción** — `src/compras/actions.ts:23-53` — inserta `expense` y luego, en un `await` separado, el `fixedExpensePayment` semilla (código agregado con la feature de compra compartida). Si falla el segundo insert, queda un one_time compartido sin pago semilla → deuda invisible desde el arranque, sin registro del fallo. Baja probabilidad (solo caída de DB entre los dos inserts). → envolver en `db.transaction`.
- 🟡 **Captura del unique constraint por string de mensaje, no por código '23505'** — `compras/actions.ts:163,210`, `balances/actions.ts:71`, `gastos-fijos/actions.ts:78,209` — frágil ante cambios de versión/locale del driver; el repo ya usa `error.code` en el webhook. → `err.code === '23505'`.
- 🟡 **`markFixedExpensePaid` no filtra `deletedAt` al validar el gasto** — `src/gastos-fijos/actions.ts:59-63` — permite registrar un pago sobre un gasto soft-borrado → fila "fantasma" (inofensiva hoy porque balance/dashboard excluyen borrados). → agregar `isNull(expense.deletedAt)`.
- 🟢 **`updateInstallment` permite fijar `installmentsPaid` a mano** — `compras/actions.ts:260-273` — desincroniza el contador de las filas de pago reales; es acción deliberada del usuario.

---

# Lista priorizada

Todos los problemas confirmados/no-refutados, deduplicados (se cita qué agentes lo detectaron). Ordenados de más a menos importante. Esfuerzo: S/M/L/XL.

### 🟠 Alta — acción prioritaria
- [ ] 🟠 **Gastos privados expuestos en agregados y listas fuera de compras** — `gastos-fijos/queries.ts:10`, `resumen/queries.ts:52`, `dashboard/queries.ts:240`, `categories` — **esfuerzo M** — [VERIFICADO] rompe la promesa "Solo tú lo verás" con cliente real; expone montos, categorías y (vía `getRecentPurchases`) descripción al otro miembro y a la IA. _Agentes 2, 3._ Fix: propagar `or(eq(isPrivate,false), eq(createdBy,userId))` a todas las queries de agregación y a `getActiveFixedExpenses`, cacheando por `(household,user)`.
- [ ] 🟠 **Editar `isShared`→false borra la deuda sin guard (deuda desaparece)** — `compras/actions.ts:243` vía `edit-installment-dialog.tsx` — **esfuerzo S** — [VERIFICADO · alcanzable hoy en cuotas] plata que un miembro debe deja de figurar en Balances, en silencio. _Agente 8._ Fix: `pendingDebtGuard` antes del update cuando `isShared` pasa a false (aplicar también a `updateFixedExpense` por el path latente).
- [ ] 🟠 **h1 "Tarjeta" en la pantalla de Compras** — `app/(app)/compras/page.tsx:219` — **esfuerzo S** — [VERIFICADO] título visible y equivocado en pantalla central. _Agente 4._ Fix: "Compras".
- [ ] 🟠 **Server Actions con `throw` en vez de `{error}`** — `compras/actions.ts:16`, `email-inbound/actions.ts:43`, `gastos-fijos/actions.ts:22`, `household/actions.ts:40` — **esfuerzo M** — [VERIFICADO] el usuario ve texto opaco y salta el error boundary. _Agentes 1, 2, 4, 5._ Fix: `{error}`; `confirmPendingExpense` debe dejar de ser `Promise<void>`.
- [ ] 🟠 **`DeleteExpenseButton` descarta el `{error}` en silencio** — `compras/components/delete-expense-button.tsx:19` — **esfuerzo S** — [VERIFICADO] el gasto no se borra y el usuario no se entera (permiso / deuda sin saldar). _Agentes 2, 4, 5._ Fix: `toast.error(result.error)` y mantener el diálogo abierto.
- [ ] 🟠 **Toggles privado/compartido no excluyentes en cuotas y fijos + posibilidad de guardar ambos** — `installment-form.tsx:198`, `fixed-expense-form.tsx:163`, `edit-installment-dialog.tsx` — **esfuerzo M** — [VERIFICADO] estado contradictorio (deuda fantasma + fuga de descripción/monto en balances). _Agentes 2, 3, 4, 5._ Fix: reseteo mutuo (idealmente un control de 3 estados) + `.refine()` en installment/fixed schemas + filtrar `isPrivate` en `getHouseholdDebtItems`.
- [ ] 🟠 **Pool `max: 1` serializa los `Promise.all` a nivel DB** — `shared/lib/db/index.ts:47` — **esfuerzo S** — [VERIFICADO] en cold cache las queries se encolan de a una; bajo concurrencia puede disparar timeouts. Tradeoff de tuning. _Agente 6._ Fix: subir `max` a 3-5 con el pooler transaction-mode y medir con carga real.

### 🟡 Media — deuda que confunde o degrada
- [ ] 🟡 **`Ajustes` muestra datos MOCK a usuario real ante error de DB** — `app/(app)/ajustes/page.tsx:86` — **S** — el `catch {}` no distingue "sin sesión" de fallo transitorio. _Agente 2._ Fix: diferenciar sin-sesión (redirect) de fallo real (error boundary).
- [ ] 🟡 **Secreto de webhook único y global para todos los hogares** — `api/webhooks/email/[householdId]/route.ts:16` — **M** — inyección de gastos fabricados en el hogar de otro. _Agente 3._ Fix: HMAC/`webhook_token` por hogar.
- [ ] 🟡 **Service-role (Auth Admin API) en request path + `listUsers` de todos** — `shared/lib/supabase/admin.ts:37` — **M** — llave privilegiada por render + 1000 usuarios. _Agentes 3, 6._ Fix: persistir `display_name` en `household_member` y backfillar.
- [ ] 🟡 **`installmentsPaid` recuenta un mes al crecer el hogar** — `compras/installment-sync.ts:31` — **M** — [VERIFICADO · latente 3+ miembros] la cuota se muestra "terminada" antes de tiempo. _Agente 8._ Fix: derivar de `COUNT(DISTINCT periodMonth)`; decrementar/recomputar en unmark.
- [ ] 🟡 **Monto del variable en Balances no usa MAX** — `balances/queries.ts:107`, `balances/actions.ts:43` — **S** — [VERIFICADO · latente 3+ miembros] sub-cobra deuda con settlement parcial. _Agente 8._ Fix: `variableMonthAmount(...)`.
- [ ] 🟡 **`createPurchase` no es atómico (expense + pago semilla)** — `compras/actions.ts:23` — **S** — deuda invisible si falla el 2º insert. _Agente 8._ Fix: `db.transaction`.
- [ ] 🟡 **Botones ✓ ambiguos (5+ acciones, tooltip invisible en touch)** — `gastos-fijos/components/fixed-expense-card.tsx:222` — **M** — en mobile no se anticipa qué mueve plata. _Agente 5._ Fix: label textual/iconos distintos.
- [ ] 🟡 **UX divergente entre los forms de edición gemelos** — `edit-expense-form.tsx` vs `edit-fixed-expense-form.tsx` — **M** — feedback in-place vs navegación; acciones distintas. _Agente 4._ Fix: unificar post-guardado y acciones.
- [ ] 🟡 **`markFixedExpensePaid` no filtra `deletedAt`** — `gastos-fijos/actions.ts:59` — **S** — pago fantasma sobre gasto borrado. _Agente 8._ Fix: `isNull(expense.deletedAt)`.
- [ ] 🟡 **Locale de fechas mixto (`es-CL` vs `es-419`)** — `date-display.tsx:9` vs varios — **M** — duplicación y riesgo de divergencia. _Agente 4._ Fix: enrutar todo por `formatDate`, fijar un locale.
- [ ] 🟡 **Dos formatos de "mes actual" en el `?month=`** — `resumen/page.tsx:59` vs `helpers.ts:16` — **M** — deeplink de mes no portable entre rutas. _Agentes 1, 4._ Fix: estandarizar a `YYYY-MM-01`.
- [ ] 🟡 **`throw`/mensajes "sin hogar" con 4 textos + voseo/tuteo** — varias actions — **M** — inconsistencia de voz/idioma visible. _Agente 4._ Fix: dialecto único + string canónico.
- [ ] 🟡 **`getUserHousehold` (auth) vive en `onboarding`** — `onboarding/queries.ts:38` — **M** — [VERIFICADO · alto→medio] grafo invertido. _Agente 1._ Fix: mover a `household`/`shared/lib/auth` con re-export temporal.
- [ ] 🟡 **Falta `requireHousehold()`: boilerplate de auth ~40-50 sitios** — `shared/lib` (crear) — **M** — el contrato de seguridad más crítico, duplicado. _Agentes 1, 7._
- [ ] 🟡 **`markAsMonthlyPayer` y `registerInstallmentShare` idénticas** — `compras/actions.ts:132` — **S** — divergencia silenciosa. _Agente 7._
- [ ] 🟡 **Reparto disperso en 10 sitios** — `compras/actions.ts:44` (+ dashboard/balances/gastos-fijos) — **M** — un cambio de regla → deudas mal calculadas. _Agente 7._ Fix: `splitShare()`/`splitShareForDb()`.
- [ ] 🟡 **Overfetch `select()` sin proyección en hot paths** — `balances/queries.ts:53`, `gastos-fijos/queries.ts:13` — **S** — arrastra jsonb no usado. _Agente 6._
- [ ] 🟡 **`getUserHousehold`… (scans redundantes de expense en dashboard)** — `dashboard/queries.ts` — **M** — tradeoff de caché; priorizar solo si molesta el cold-load. _Agente 6._

### 🟢 Baja — limpieza y mantenimiento
- [ ] 🟢 **`mark-paid-dialog`: `loading` nunca se activa (dead code)** — `gastos-fijos/components/mark-paid-dialog.tsx:42` — **S** — _Agentes 2, 5._
- [ ] 🟢 **No se puede poner en 0/limpiar el presupuesto de categoría** — `categories/components/category-manager.tsx:128` — **S** — `budget === '' ? null : Number(budget)`. _Agente 2._
- [ ] 🟢 **Fecha por defecto en UTC** — `compras/components/purchase-form.tsx:55` — **M** — bucket de mes equivocado de noche/fin de mes en Chile. _Agente 2._
- [ ] 🟢 **Copy "Se divide entre los dos" asume hogar de 2** — `installment-form.tsx:208`, `fixed-expense-form.tsx:169`, `edit-installment-dialog.tsx:113` — **S** — _Agentes 4, 5._
- [ ] 🟢 **CSV injection (fórmulas) en el export** — `api/compras/export/route.ts:7` — **S** — prefijar `'` a celdas que empiezan por `= + - @`. _Agente 3._
- [ ] 🟢 **Invite page usa `getSession()`** — `app/invite/[token]/page.tsx:12` — **S** — _Agente 3._
- [ ] 🟢 **`"use client"` innecesario en `BudgetProgress`** — `resumen/components/budget-progress.tsx:1` — **S** — _Agente 6._
- [ ] 🟢 **`getPendingCount` sin caché en el layout global** — `app/(app)/layout.tsx:53` — **S** — roundtrip serial en cada navegación. _Agente 6._
- [ ] 🟢 **Manejo de unique constraint por string 4 veces** — `compras/actions.ts:163` — **S** — `isUniqueViolation(err)` por code 23505. _Agentes 7, 8._
- [ ] 🟢 **Boilerplate de transporte Gemini duplicado ×3** — `receipts/gemini.ts:53` — **M** — `callGemini<T>()` en shared. _Agente 7._
- [ ] 🟢 **Columna `ownerId` código muerto** — `db/schema/expense.ts:25` — **S** — _Agente 7._
- [ ] 🟢 **Default de moneda `'ARS'` en app chilena** — `db/schema/expense.ts:36` — **S** — _Agentes 4, 7, 8._
- [ ] 🟢 **`updateInstallment` permite `installmentsPaid` a mano** — `compras/actions.ts:260` — **M** — _Agente 8._
- [ ] 🟢 **`CurrencyDisplay`/`DateDisplay` exportados sin uso** — `shared/components/currency-display.tsx:19` — **S** — _Agente 7._
- [ ] 🟢 **`CategoryBudgetStatus` en `dashboard`, no en `categories`** — `categories/queries.ts:6` — **S** — _Agente 1._
- [ ] 🟢 **Dos raíces de utilidades `src/lib` vs `src/shared/lib`** — `lib/utils.ts:5` — **S** — _Agente 1._
- [ ] 🟢 **Dependencias bidireccionales entre features** — `balances/actions.ts:11` — **L** — [VERIFICADO · alto→bajo] higiene del grafo, sin ciclo real. _Agente 1._
- [ ] 🟢 **Faltan `loading.tsx`** en `ingresos`/`ajustes`/`gastos-pendientes` — **S** — _Agente 4._
- [ ] 🟢 **Tests de aislamiento por hogar en el path Drizzle** — `shared/lib/db/index.ts` — **M** — red de seguridad para el filtro `where(householdId)` (derivado de la refutación de RLS). _Agente 3._

---

# Roadmap recomendado

## Sprint 1 — Críticos (privacidad y datos)
- Gastos privados en agregados y listas fuera de compras (`gastos-fijos/queries.ts:10`, `resumen/queries.ts:52`, `dashboard/queries.ts:240`, `categories`) — **prioridad absoluta**, cliente real en producción.
- Guard en la edición de `isShared` (`compras/actions.ts:243` + `updateFixedExpense`): reutilizar `pendingDebtGuard` cuando pasa a false.
- Gasto privado+compartido: `.refine()` en installment/fixed + reseteo mutuo de toggles + filtrar `isPrivate` en `getHouseholdDebtItems`.
- h1 "Tarjeta" → "Compras" (`compras/page.tsx:219`).

## Sprint 2 — Seguridad y estabilidad
- Unificar `throw` → `{error}` en las actions de creación/edición (`compras/actions.ts:16`, `email-inbound/actions.ts:43`, `gastos-fijos/actions.ts:22`, `household/actions.ts:40`).
- `DeleteExpenseButton`: feedback de error (`delete-expense-button.tsx:19`).
- Ajustes: eliminar el fallback a MOCK en producción (`ajustes/page.tsx:86`).
- Secreto de webhook por hogar (HMAC) (`webhooks/email/[householdId]/route.ts:16`).
- Sacar la service-role del request path: persistir `display_name` y backfillar (`admin.ts:37`).
- `createPurchase` atómico con `db.transaction` (`compras/actions.ts:23`).
- `markFixedExpensePaid` con `isNull(deletedAt)` (`gastos-fijos/actions.ts:59`).
- CSV injection en el export (`compras/export/route.ts:7`); invite con `getSessionUser()` (`invite/[token]/page.tsx:12`).
- Tests de aislamiento por hogar en el path Drizzle.

## Sprint 3 — Rendimiento
- Subir `pool.max` a 3-5 con el pooler transaction-mode y medir con carga real (`shared/lib/db/index.ts:47`).
- Proyectar columnas en los `select()` de hot paths (`balances/queries.ts:53`, `gastos-fijos/queries.ts:13`).
- `"use client"` fuera de `BudgetProgress` (`budget-progress.tsx:1`).
- Cachear `getPendingCount` con tag propio (`layout.tsx:53`).
- (Opcional, solo si molesta el cold-load) consolidar los scans redundantes del dashboard.

## Sprint 4 — UX / Consistencia
- Toggles privado/compartido excluyentes en installment/fixed forms + copy N-aware "Se divide con el resto del hogar" (`installment-form.tsx`, `fixed-expense-form.tsx`, `edit-installment-dialog.tsx`).
- Botones de acción del card de gastos fijos: label textual/iconos distintos (`fixed-expense-card.tsx:222`).
- Unificar UX de los forms de edición gemelos (post-guardado + acciones).
- Fecha por defecto en zona local (`purchase-form.tsx:55`); permitir presupuesto en 0 (`category-manager.tsx:128`).
- Resolver el `loading` dead code (`mark-paid-dialog.tsx:42`); agregar `loading.tsx` faltantes.
- Locale de fecha único; dialecto único (tuteo) + strings canónicos "sin hogar".

## Sprint 5 — Refactorización (mantenibilidad)
- `requireHousehold()` y migrar los ~40-50 sitios (`shared/lib`).
- Deduplicar `markAsMonthlyPayer`/`registerInstallmentShare` (`compras/actions.ts:132`).
- Centralizar el reparto: `splitShare()`/`splitShareForDb()` (`compras/actions.ts:44`).
- `installmentsPaid` derivado de `COUNT(DISTINCT periodMonth)` y monto variable con MAX en Balances (pre-requisito para escalar a 3+ miembros).
- Consolidar utilidades de fecha/mes y unificar formatos; `isUniqueViolation(err)` por code 23505; `callGemini<T>()` compartido.
- Mover `getUserHousehold` a `household`/`shared`; extraer módulos-contrato para las deps bidireccionales.
- Limpieza de código muerto: columna `ownerId`, default `'ARS'`→`'CLP'`, `CurrencyDisplay`/`DateDisplay`, reubicar `CategoryBudgetStatus`, unificar `src/lib` en `src/shared/lib`.

---

## Nota metodológica
8 agentes especializados leyeron el código real (no supusieron); los hallazgos 🔴/🟠 se verificaron adversarialmente contra el código citado. La verificación **refutó** el hallazgo de RLS (modelo de dos capas intencional), **degradó** dos hallazgos "alto" de arquitectura a cosméticos, y **calibró** el hallazgo de edición de `isShared` de 🔴 a 🟠 (recuperable + edición deliberada). Se marcaron como **LATENTES** los hallazgos de integridad que solo se disparan con 3+ miembros, dado que el hogar en producción es de 2.
