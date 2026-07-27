/**
 * @jest-environment node
 *
 * Tests de aislamiento por hogar (Sprint 5 del roadmap de auditoría).
 *
 * No hay una base de datos de test real en este proyecto — todo se testea
 * mockeando `@/shared/lib/db`. Estos tests no prueban una BD real con dos
 * hogares; prueban que la condición `where()` que cada query arma REALMENTE
 * filtra por el household_id correcto (usando los `eq`/`and` reales de
 * drizzle-orm, no mockeados), convirtiéndola a SQL con PgDialect para poder
 * inspeccionar columna y parámetro.
 *
 * Alcance: las funciones de mayor riesgo detectadas en la auditoría —
 * (1) las que filtran fixed_expense_payment vía JOIN a expense.household_id
 * en vez de su propia columna household_id (más frágil ante refactors del
 * join), y (2) las que reciben un id de recurso (expenseId/id) junto con
 * householdId, donde alguien podría sacar el segundo filtro pensando que el
 * id ya alcanza (IDOR). También un control positivo sobre resumen/queries.ts,
 * que sí filtra fixed_expense_payment.household_id directo — para que no
 * regrese al patrón más frágil de los otros dominios.
 */
export {};

import { PgDialect } from "drizzle-orm/pg-core";

const dialect = new PgDialect();

function sqlOf(condition: unknown) {
  return dialect.sqlToQuery(condition as Parameters<typeof dialect.sqlToQuery>[0]);
}

type Builder = {
  from: jest.Mock;
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  groupBy: jest.Mock;
  $dynamic: jest.Mock;
  then: (resolve: (rows: unknown[]) => void, reject?: (err: unknown) => void) => Promise<unknown>;
};

/** Query builder mock encadenable: captura cada condición pasada a where(). */
function makeBuilder(rows: unknown[] = []): { builder: Builder; wheres: unknown[] } {
  const wheres: unknown[] = [];
  const builder: Builder = {
    from: jest.fn(() => builder),
    innerJoin: jest.fn(() => builder),
    leftJoin: jest.fn(() => builder),
    where: jest.fn((condition: unknown) => {
      wheres.push(condition);
      return builder;
    }),
    orderBy: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    offset: jest.fn(() => builder),
    groupBy: jest.fn(() => builder),
    $dynamic: jest.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return { builder, wheres };
}

const mockSelect = jest.fn();
jest.mock("@/shared/lib/db", () => ({ db: { select: (...args: unknown[]) => mockSelect(...args) } }));
jest.mock("next/cache", () => ({ cacheTag: jest.fn() }));

const HOUSEHOLD_A = "550e8400-e29b-41d4-a716-446655440001";
const HOUSEHOLD_B = "550e8400-e29b-41d4-a716-446655440002";
const EXPENSE_ID = "550e8400-e29b-41d4-a716-446655440010";
const USER_ID = "550e8400-e29b-41d4-a716-446655440020";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("filtros indirectos vía JOIN (fixed_expense_payment leída sin su propia household_id)", () => {
  it("compras/queries.ts getSharedInstallmentPaymentsForPeriod filtra por expense.household_id", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getSharedInstallmentPaymentsForPeriod } = await import("@/compras/queries");
    await getSharedInstallmentPaymentsForPeriod(HOUSEHOLD_A, "2026-07-01");

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"expense"."household_id" = $`);
    expect(params).toContain(HOUSEHOLD_A);
  });

  it("gastos-fijos/queries.ts getAllFixedPaymentsForPeriod filtra por expense.household_id", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getAllFixedPaymentsForPeriod } = await import("@/gastos-fijos/queries");
    await getAllFixedPaymentsForPeriod(HOUSEHOLD_A, "2026-07-01");

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"expense"."household_id" = $`);
    expect(params).toContain(HOUSEHOLD_A);
  });

  it("balances/queries.ts getPendingBalances filtra ambas queries (expenses directo + allPayments vía join) por el household correcto", async () => {
    const expensesBuilder = makeBuilder([
      { id: EXPENSE_ID, type: "fixed", description: "Arriendo", amount: "100000", installmentAmount: null },
    ]);
    const paymentsBuilder = makeBuilder([]);
    mockSelect
      .mockReturnValueOnce(expensesBuilder.builder)
      .mockReturnValueOnce(paymentsBuilder.builder);

    const { getPendingBalances } = await import("@/balances/queries");
    await getPendingBalances(HOUSEHOLD_A, 2, new Map([[USER_ID, "User"]]), USER_ID);

    const expensesWhere = sqlOf(expensesBuilder.wheres[0]);
    expect(expensesWhere.sql).toContain(`"expense"."household_id" = $`);
    expect(expensesWhere.params).toContain(HOUSEHOLD_A);

    const paymentsWhere = sqlOf(paymentsBuilder.wheres[0]);
    expect(paymentsWhere.sql).toContain(`"expense"."household_id" = $`);
    expect(paymentsWhere.params).toContain(HOUSEHOLD_A);
  });
});

describe("resource-id + householdId (IDOR: el id del recurso solo no debe alcanzar)", () => {
  it("compras/queries.ts getExpenseById exige id Y household_id en el mismo where", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getExpenseById } = await import("@/compras/queries");
    await getExpenseById(EXPENSE_ID, HOUSEHOLD_A);

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"expense"."id" = $`);
    expect(sql).toContain(`"expense"."household_id" = $`);
    expect(params).toContain(EXPENSE_ID);
    expect(params).toContain(HOUSEHOLD_A);
  });

  it("gastos-fijos/queries.ts getFixedExpensePayments exige expenseId Y household_id", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getFixedExpensePayments } = await import("@/gastos-fijos/queries");
    await getFixedExpensePayments(EXPENSE_ID, HOUSEHOLD_A);

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"fixed_expense_payment"."expense_id" = $`);
    expect(sql).toContain(`"fixed_expense_payment"."household_id" = $`);
    expect(params).toContain(EXPENSE_ID);
    expect(params).toContain(HOUSEHOLD_A);
  });

  it("gastos-fijos/queries.ts getPaymentsForMonth exige expenseId Y household_id", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getPaymentsForMonth } = await import("@/gastos-fijos/queries");
    await getPaymentsForMonth(EXPENSE_ID, "2026-07-01", HOUSEHOLD_A);

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"fixed_expense_payment"."expense_id" = $`);
    expect(sql).toContain(`"fixed_expense_payment"."household_id" = $`);
    expect(params).toContain(EXPENSE_ID);
    expect(params).toContain(HOUSEHOLD_A);
  });

  it("email-inbound/queries.ts getPendingById exige id Y household_id", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getPendingById } = await import("@/email-inbound/queries");
    await getPendingById(EXPENSE_ID, HOUSEHOLD_A);

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"pending_expense"."id" = $`);
    expect(sql).toContain(`"pending_expense"."household_id" = $`);
    expect(params).toContain(EXPENSE_ID);
    expect(params).toContain(HOUSEHOLD_A);
  });
});

describe("control positivo: resumen/queries.ts filtra fixed_expense_payment.household_id directo (no solo vía join)", () => {
  it("getMonthlySummary filtra la query de pagos fijos por fixed_expense_payment.household_id", async () => {
    const paymentsBuilder = makeBuilder([]);
    const installmentsBuilder = makeBuilder([]);
    const oneTimeBuilder = makeBuilder([]);
    const categoriesBuilder = makeBuilder([]);
    mockSelect
      .mockReturnValueOnce(paymentsBuilder.builder)
      .mockReturnValueOnce(installmentsBuilder.builder)
      .mockReturnValueOnce(oneTimeBuilder.builder)
      .mockReturnValueOnce(categoriesBuilder.builder);

    const { getMonthlySummary } = await import("@/resumen/queries");
    await getMonthlySummary(HOUSEHOLD_A, "2026-07-01", USER_ID);

    const { sql, params } = sqlOf(paymentsBuilder.wheres[0]);
    // A diferencia de compras/gastos-fijos/balances, acá el filtro es sobre
    // la columna propia de la tabla leída, no solo sobre expense vía join.
    expect(sql).toContain(`"fixed_expense_payment"."household_id" = $`);
    expect(params).toContain(HOUSEHOLD_A);
  });
});

describe("distingue hogares distintos (no matchea con un household ajeno)", () => {
  it("getExpenseById arma el filtro con el household pasado, no con otro", async () => {
    const { builder, wheres } = makeBuilder([]);
    mockSelect.mockReturnValueOnce(builder);

    const { getExpenseById } = await import("@/compras/queries");
    await getExpenseById(EXPENSE_ID, HOUSEHOLD_B);

    const { params } = sqlOf(wheres[0]);
    expect(params).toContain(HOUSEHOLD_B);
    expect(params).not.toContain(HOUSEHOLD_A);
  });
});
