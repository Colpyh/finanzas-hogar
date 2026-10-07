import "server-only";
import { z } from "zod";
import { monthToDate } from "@/resumen/month-utils";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { variableMonthAmount } from "@/shared/lib/variable-expense";
import { getMonthlySummary, getInstallmentBurden } from "@/resumen/queries";
import { getAnnualSummary } from "@/resumen/annual-queries";
import { getMonthlyIncomeTotal } from "@/ingresos/queries";
import { getExpenses } from "@/compras/queries";
import { getCategories } from "@/categories/queries";
import { getActiveFixedExpenses, getAllFixedPaymentsForPeriod } from "@/gastos-fijos/queries";
import { getPendingBalances } from "@/balances/queries";
import type { MemberAliases } from "./aliases";
import { toolMonthSchema } from "./types";

/**
 * Herramientas de SOLO LECTURA que la IA puede invocar para responder.
 *
 * El hogar y el usuario salen del contexto autenticado del server (nunca de
 * los argumentos de la IA) — la IA solo elige QUÉ consultar y de qué mes.
 * Todo reusa las queries que ya alimentan las páginas (mismos cálculos,
 * misma visibilidad de gastos privados, misma caché).
 */

export type ChatToolContext = {
  householdId: string;
  userId: string;
  members: { userId: string; displayName: string }[];
  aliases: MemberAliases;
};

export type ChatToolDeclaration = {
  name: string;
  description: string;
  parameters?: object;
};

const MONTH_PARAM = {
  type: "STRING",
  description: "Mes en formato YYYY-MM (ej. 2026-07).",
};

export const CHAT_TOOL_DECLARATIONS: ChatToolDeclaration[] = [
  {
    name: "resumen_mes",
    description:
      "Totales de un mes: ingreso del hogar, gasto total, gastos fijos/cuentas, compras, cuotas y gasto por categoría con su presupuesto.",
    parameters: { type: "OBJECT", properties: { mes: MONTH_PARAM }, required: ["mes"] },
  },
  {
    name: "evolucion_anual",
    description: "Gasto e ingreso total de cada uno de los últimos 12 meses (para comparar meses o ver tendencias).",
  },
  {
    name: "compras_del_mes",
    description:
      "Lista de compras puntuales (no cuotas ni gastos fijos) de un mes por fecha de compra, con descripción, monto y categoría. Opcionalmente filtra por texto en descripción o categoría.",
    parameters: {
      type: "OBJECT",
      properties: {
        mes: MONTH_PARAM,
        buscar: { type: "STRING", description: "Texto a buscar (ej. 'supermercado', 'uber'). Opcional." },
      },
      required: ["mes"],
    },
  },
  {
    name: "gastos_fijos",
    description:
      "Gastos fijos y cuentas variables activas (arriendo, luz, agua, suscripciones) con su monto del mes y quién ya pagó ese mes.",
    parameters: { type: "OBJECT", properties: { mes: MONTH_PARAM }, required: ["mes"] },
  },
  {
    name: "cuotas",
    description: "Compras en cuotas vigentes en un mes: monto mensual de cada una y cuotas restantes.",
    parameters: { type: "OBJECT", properties: { mes: MONTH_PARAM }, required: ["mes"] },
  },
  {
    name: "balances",
    description:
      "Deudas pendientes ACUMULADAS entre miembros del hogar (todos los meses no saldados): neto con cada persona y detalle de ítems.",
  },
];

const MAX_PURCHASES = 60;
const MAX_BALANCE_ITEMS = 15;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const day = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function parseMonth(args: Record<string, unknown>): string {
  const parsed = toolMonthSchema.safeParse(args.mes);
  if (!parsed.success) throw new ToolArgError("mes inválido: usa el formato YYYY-MM");
  return parsed.data;
}

/** Error de argumentos: se le devuelve a la IA para que corrija, no se loguea como fallo. */
export class ToolArgError extends Error {}

async function resumenMes(ctx: ChatToolContext, args: Record<string, unknown>) {
  const mes = parseMonth(args);
  const monthDb = monthToDate(mes);
  const [summary, ingreso] = await Promise.all([
    getMonthlySummary(ctx.householdId, monthDb, ctx.userId),
    getMonthlyIncomeTotal(ctx.householdId, monthDb),
  ]);
  return {
    mes,
    ingresoDelHogar: ingreso,
    gastoTotal: summary.grandTotal,
    gastosFijosYCuentas: summary.fixedTotal,
    compras: summary.oneTimeTotal,
    cuotas: summary.installmentsTotal,
    porCategoria: summary.byCategory.map((c) => ({
      categoria: c.categoryName,
      gastado: c.total,
      presupuesto: c.budget,
    })),
  };
}

async function evolucionAnual(ctx: ChatToolContext) {
  const points = await getAnnualSummary(ctx.householdId, currentPeriodMonth());
  return {
    meses: points.map((p) => ({ mes: p.month.slice(0, 7), gastos: p.expenses, ingresos: p.income })),
  };
}

async function comprasDelMes(ctx: ChatToolContext, args: Record<string, unknown>) {
  const mes = parseMonth(args);
  const buscar = typeof args.buscar === "string" ? normalize(args.buscar.trim()) : "";

  const [rows, categories] = await Promise.all([
    getExpenses(
      ctx.householdId,
      { type: "one_time", dateFrom: `${mes}-01`, dateTo: lastDayOfMonth(mes) },
      ctx.userId
    ),
    getCategories(ctx.householdId),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const compras = rows
    .map((r) => ({
      fecha: r.expenseDate,
      descripcion: r.description,
      monto: Number(r.amount ?? 0),
      categoria: (r.categoryId && categoryName.get(r.categoryId)) || "Sin categoría",
      compartida: r.isShared,
      tarjeta: r.cardName ?? null,
    }))
    .filter((c) => !buscar || normalize(`${c.descripcion} ${c.categoria}`).includes(buscar))
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

  return {
    mes,
    filtro: buscar || null,
    cantidad: compras.length,
    total: compras.reduce((sum, c) => sum + c.monto, 0),
    compras: compras.slice(0, MAX_PURCHASES),
    listaTruncada: compras.length > MAX_PURCHASES,
  };
}

async function gastosFijos(ctx: ChatToolContext, args: Record<string, unknown>) {
  const mes = parseMonth(args);
  const [fixed, payments] = await Promise.all([
    getActiveFixedExpenses(ctx.householdId, ctx.userId),
    getAllFixedPaymentsForPeriod(ctx.householdId, monthToDate(mes)),
  ]);

  const paidByExpense = new Map<string, { paidBy: string; amount: string }[]>();
  for (const { payment } of payments) {
    if (payment.status !== "paid") continue;
    const list = paidByExpense.get(payment.expenseId) ?? [];
    list.push(payment);
    paidByExpense.set(payment.expenseId, list);
  }

  return {
    mes,
    gastos: fixed.map((e) => {
      const paid = paidByExpense.get(e.id) ?? [];
      return {
        descripcion: e.description,
        tipo: e.type === "variable" ? "cuenta variable" : "fijo",
        // Variables: el monto del mes vive en los pagos (máximo, no suma); sin pagos aún = desconocido.
        montoDelMes:
          e.type === "variable"
            ? paid.length > 0 ? variableMonthAmount(paid.map((p) => p.amount)) : null
            : Number(e.amount ?? 0),
        diaDePago: e.recurrenceDay,
        compartido: e.isShared,
        pagadoPor: [...new Set(paid.map((p) => ctx.aliases.aliasOf(p.paidBy)))],
      };
    }),
  };
}

async function cuotas(ctx: ChatToolContext, args: Record<string, unknown>) {
  const mes = parseMonth(args);
  const burden = await getInstallmentBurden(ctx.householdId, monthToDate(mes), ctx.userId);
  return {
    mes,
    totalMensualEnCuotas: burden.monthlyLockIn,
    cuotas: burden.installments.map((i) => ({
      descripcion: i.description,
      montoMensual: i.amount,
      cuotasRestantes: i.remaining,
    })),
  };
}

async function balances(ctx: ChatToolContext) {
  const memberMap = new Map(ctx.members.map((m) => [m.userId, m.displayName]));
  const result = await getPendingBalances(ctx.householdId, ctx.members.length, memberMap, ctx.userId);
  return {
    balances: result.map((b) => ({
      persona: ctx.aliases.aliasOf(b.memberId),
      neto: b.net,
      sentido: b.net > 0 ? "esa persona te debe" : b.net < 0 ? "tú le debes" : "están a mano",
      cantidadItems: b.items.length,
      items: b.items.slice(0, MAX_BALANCE_ITEMS).map((i) => ({
        descripcion: i.description,
        mes: i.periodMonth.slice(0, 7),
        montoTotal: i.totalAmount,
        parte: i.shareAmount,
        pago: ctx.aliases.aliasOf(i.payerId),
        debe: ctx.aliases.aliasOf(i.debtorId),
      })),
    })),
  };
}

const HANDLERS: Record<
  string,
  (ctx: ChatToolContext, args: Record<string, unknown>) => Promise<Record<string, unknown>>
> = {
  resumen_mes: resumenMes,
  evolucion_anual: evolucionAnual,
  compras_del_mes: comprasDelMes,
  gastos_fijos: gastosFijos,
  cuotas,
  balances,
};

const argsSchema = z.record(z.string(), z.unknown());

export async function executeChatTool(
  ctx: ChatToolContext,
  name: string,
  rawArgs: unknown
): Promise<Record<string, unknown>> {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Herramienta desconocida: ${name}` };
  const args = argsSchema.safeParse(rawArgs ?? {});
  try {
    return await handler(ctx, args.success ? args.data : {});
  } catch (err) {
    if (err instanceof ToolArgError) return { error: err.message };
    console.warn("[chat] tool_error", { name });
    return { error: "No se pudo obtener ese dato." };
  }
}
