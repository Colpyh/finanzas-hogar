# Finanzas Hogar — Rediseño UI/UX

## ¿Qué es esta app?

**Finanzas Hogar** es una app móvil web (Next.js, mobile-first, 390px) para gestión de gastos compartidos entre parejas/familias. Permite registrar gastos fijos, compras en cuotas, hacer seguimiento de tarjetas de crédito y ver resúmenes mensuales.

## Stack técnico

- **Framework**: Next.js 16 (App Router, Server Components + Client Components)
- **Estilos**: Tailwind CSS v4
- **Componentes UI**: Base UI (React) — similar a shadcn/ui
- **Colores primarios**: Violeta `#7c3aed` (primary), fondo levemente violáceo `#f7f6fd`
- **Radio**: 14px base, 18px para cards principales
- **Tipografía**: Inter / system-ui

## Pantallas existentes

| Pantalla | Archivo | Descripción |
|---|---|---|
| Dashboard | `screens/dashboard.html` | Inicio con resumen mensual, widgets de tarjetas, presupuestos, gastos fijos y compras recientes |
| Gastos Fijos | `screens/gastos-fijos.html` | Lista de gastos recurrentes (arriendo, servicios) con estado de pago por miembro |
| Compras | `screens/compras.html` | Historial de compras y cuotas con filtros por tipo y tarjeta |
| Resumen | `screens/resumen.html` | Análisis por categoría, distribución fijos/variables, gráfico anual |
| Ajustes | `screens/ajustes.html` | Configuración del hogar, miembros, tarjetas, categorías, apariencia |

## Navegación

Bottom navigation bar (móvil) / Side navigation (desktop md+):
- **Inicio** (LayoutDashboard) → /dashboard
- **Fijos** (Receipt) → /gastos-fijos
- **Compras** (ShoppingCart) → /compras
- **Resumen** (BarChart2) → /resumen
- **Pendientes** (Inbox) → /gastos-pendientes — con badge de count
- **Ajustes** (Settings) → /ajustes

## Flujos principales

1. **Agregar gasto fijo**: botón "Nuevo" en /gastos-fijos → formulario → guardar
2. **Marcar como pagado**: cada gasto tiene botones "Reservar" (🕐) y "Pagar" (✓) inline
3. **Agregar compra**: botón "Nueva" en /compras → formulario con tipo (una vez / cuotas) + tarjeta
4. **Agregar tarjeta**: sección Tarjetas en /ajustes → formulario inline con nombre, últimos 4 dígitos, límite, día de cierre, día de pago
5. **Gastos pendientes**: emails de BCI parsean automáticamente y aparecen en /gastos-pendientes para confirmar o descartar

## Qué mejorar visualmente

La app funciona bien pero el diseño visual es **genérico**. Objetivos del rediseño:

- **Identidad visual más fuerte** — la paleta violeta existe pero no se explota bien
- **Jerarquía tipográfica** — los números de dinero deberían ser el elemento dominante en cada pantalla
- **Dashboard** — el summary card violeta es el punto fuerte; el resto de widgets son demasiado similares entre sí
- **Gastos Fijos** — la lista de ítems necesita más personalidad; el estado "pagado/pendiente" debería ser más obvio
- **Navegación** — la bottom nav funciona pero se ve básica
- **Micro-interacciones** — faltan transiciones, estados hover y feedback visual

## Restricciones

- Mobile-first: ancho máximo contenido ~480px
- Soporta modo oscuro (ya implementado, misma identidad que claro)
- Sin cambios en lógica de negocio ni estructura de datos
- Los componentes disponibles: Button, Input, Label, Card, Dialog, Select, Sheet, Badge, Skeleton, Separator
