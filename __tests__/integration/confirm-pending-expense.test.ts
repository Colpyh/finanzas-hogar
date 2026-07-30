/**
 * @jest-environment node
 *
 * Integration tests for confirmPendingExpense and discardPendingExpense
 * from @/email-inbound/actions
 */
export {};

import { PgDialect } from "drizzle-orm/pg-core";
const dialect = new PgDialect();
function sqlOf(condition: unknown) {
  return dialect.sqlToQuery(condition as Parameters<typeof dialect.sqlToQuery>[0]);
}

const UUID_PENDING = "550e8400-e29b-41d4-a716-446655440020";
const UUID_CATEGORY = "550e8400-e29b-41d4-a716-446655440021";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440022";
const UUID_USER = "550e8400-e29b-41d4-a716-446655440023";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440024";

// --- Mocks ---

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "user@test.com" }),
}));

const UUID_OTHER_USER = "550e8400-e29b-41d4-a716-446655440026";

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
  getHouseholdMembers: jest.fn().mockResolvedValue([
    { id: "m1", userId: UUID_USER, role: "owner", displayName: "User" },
    { id: "m2", userId: UUID_OTHER_USER, role: "member", displayName: "Other" },
  ]),
}));

const mockTxSelect = jest.fn();
const mockTxInsert = jest.fn();
const mockTxUpdate = jest.fn();
const mockTransaction = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/shared/lib/db", () => ({
  db: {
    transaction: mockTransaction,
    update: mockUpdate,
  },
}));

const VALID_INPUT = {
  pendingExpenseId: UUID_PENDING,
  categoryId: UUID_CATEGORY,
  description: "MUNICH",
  amount: "4000.00",
  expenseDate: "2026-04-19",
};

const PENDING_ROW = {
  id: UUID_PENDING,
  householdId: UUID_HOUSEHOLD,
  parsedAmount: "4000.00",
  parsedDate: "2026-04-19",
  status: "pending",
};

describe("confirmPendingExpense", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      return cb({ select: mockTxSelect, insert: mockTxInsert, update: mockTxUpdate });
    });
  });

  it("returns error on invalid input (missing required fields)", async () => {
    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense({} as never);
    expect(result.error).toBeTruthy();
  });

  it("returns error on invalid UUID", async () => {
    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense({
      pendingExpenseId: "not-a-uuid",
      categoryId: UUID_CATEGORY,
      description: "Test",
      amount: "4000.00",
      expenseDate: "2026-04-19",
    });
    expect(result.error).toBeTruthy();
  });

  it("returns error when no household", async () => {
    const { getUserHousehold } = await import("@/household/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce(null);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense(VALID_INPUT);
    expect(result.error).toBe("No tienes un hogar activo");
  });

  it("returns error when pending expense not found in transaction", async () => {
    const chain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockTxSelect.mockReturnValue(chain);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense(VALID_INPUT);
    expect(result.error).toBe("Este gasto pendiente ya fue procesado o no existe");
  });

  it("inserts expense and updates pending on happy path, revalidates paths", async () => {
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([PENDING_ROW]),
    };
    mockTxSelect.mockReturnValue(selectChain);

    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    mockTxInsert.mockReturnValue(insertChain);

    const updateChain = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    };
    mockTxUpdate.mockReturnValue(updateChain);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await confirmPendingExpense(VALID_INPUT);

    expect(mockTxInsert).toHaveBeenCalled();
    expect(mockTxUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastos-pendientes");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
  });

  it("confirma un pendiente sin monto/fecha detectados usando lo que completó el usuario a mano", async () => {
    // El parser no reconoció el formato del correo — ambos quedaron null.
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { ...PENDING_ROW, parsedAmount: null, parsedDate: null },
      ]),
    };
    mockTxSelect.mockReturnValue(selectChain);

    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    mockTxInsert.mockReturnValue(insertChain);
    mockTxUpdate.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    });

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense({
      ...VALID_INPUT,
      amount: "12345.00",
      expenseDate: "2026-07-20",
    });

    expect(result).toEqual({});
    const values = insertChain.values.mock.calls[0][0];
    expect(values.amount).toBe("12345.00");
    expect(values.expenseDate).toBe("2026-07-20");
  });

  it("auto-links the card when parsedCardLast4 matches exactly one card", async () => {
    const UUID_CARD = "550e8400-e29b-41d4-a716-446655440025";
    const pendingChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ ...PENDING_ROW, parsedCardLast4: "7566" }]),
    };
    const cardChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: UUID_CARD }]),
    };
    mockTxSelect
      .mockReturnValueOnce(pendingChain)
      .mockReturnValueOnce(cardChain);

    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    mockTxInsert.mockReturnValue(insertChain);
    mockTxUpdate.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    });

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await confirmPendingExpense(VALID_INPUT);

    const values = insertChain.values.mock.calls[0][0];
    expect(values.cardId).toBe(UUID_CARD);
  });

  it("does not link a card when two cards share the same last4 (ambiguous)", async () => {
    const pendingChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ ...PENDING_ROW, parsedCardLast4: "7566" }]),
    };
    const cardChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: "card-a" }, { id: "card-b" }]),
    };
    mockTxSelect
      .mockReturnValueOnce(pendingChain)
      .mockReturnValueOnce(cardChain);

    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    mockTxInsert.mockReturnValue(insertChain);
    mockTxUpdate.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    });

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await confirmPendingExpense(VALID_INPUT);

    const values = insertChain.values.mock.calls[0][0];
    expect(values.cardId).toBeUndefined();
  });

  it("solo busca el pendiente entre los propios (created_by_user_id = quien confirma)", async () => {
    const wheres: unknown[] = [];
    const pendingChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn((cond: unknown) => {
        wheres.push(cond);
        return pendingChain;
      }),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockTxSelect.mockReturnValueOnce(pendingChain);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await confirmPendingExpense(VALID_INPUT);

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"pending_expense"."created_by_user_id" = $`);
    expect(params).toContain(UUID_USER);
  });

  it("persiste isPrivate/isShared del payload en el gasto creado", async () => {
    const pendingChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([PENDING_ROW]),
    };
    mockTxSelect.mockReturnValueOnce(pendingChain);

    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    mockTxInsert.mockReturnValueOnce(insertChain);
    mockTxUpdate.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    });

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await confirmPendingExpense({ ...VALID_INPUT, isPrivate: true });

    const values = insertChain.values.mock.calls[0][0];
    expect(values.isPrivate).toBe(true);
    expect(values.isShared).toBe(false);
  });

  it("compartido: además del gasto, siembra el pago de quien confirmó (aparece en Balances)", async () => {
    const pendingChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([PENDING_ROW]),
    };
    mockTxSelect.mockReturnValueOnce(pendingChain);

    const expenseInsertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    const paymentInsertChain = { values: jest.fn().mockResolvedValue(undefined) };
    mockTxInsert
      .mockReturnValueOnce(expenseInsertChain)
      .mockReturnValueOnce(paymentInsertChain);
    mockTxUpdate.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    });

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense({ ...VALID_INPUT, isShared: true });

    expect(result).toEqual({});
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
    const paymentValues = paymentInsertChain.values.mock.calls[0][0];
    expect(paymentValues.paidBy).toBe(UUID_USER);
    expect(paymentValues.status).toBe("paid");
    // 4000 / 2 miembros
    expect(paymentValues.amount).toBe("2000.00");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/balances");
  });
});

describe("discardPendingExpense", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error on invalid UUID", async () => {
    const { discardPendingExpense } = await import("@/email-inbound/actions");
    const result = await discardPendingExpense({ pendingExpenseId: "not-a-uuid" });
    expect(result.error).toBeTruthy();
  });

  it("returns error when no household", async () => {
    const { getUserHousehold } = await import("@/household/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce(null);

    const { discardPendingExpense } = await import("@/email-inbound/actions");
    const result = await discardPendingExpense({ pendingExpenseId: UUID_PENDING });
    expect(result.error).toBe("No tienes un hogar activo");
  });

  it("returns error when pending expense not found (0 rows updated)", async () => {
    const updateChain = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    };
    mockUpdate.mockReturnValue(updateChain);

    const { discardPendingExpense } = await import("@/email-inbound/actions");
    const result = await discardPendingExpense({ pendingExpenseId: UUID_PENDING });
    expect(result.error).toBe("Este gasto pendiente ya fue procesado o no existe");
  });

  it("updates to discarded and revalidates /gastos-pendientes on happy path", async () => {
    const updateChain = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    };
    mockUpdate.mockReturnValue(updateChain);

    const { discardPendingExpense } = await import("@/email-inbound/actions");
    await discardPendingExpense({ pendingExpenseId: UUID_PENDING });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastos-pendientes");
  });

  it("solo descarta pendientes propios (created_by_user_id = quien descarta)", async () => {
    const wheres: unknown[] = [];
    const updateChain = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn((cond: unknown) => {
        wheres.push(cond);
        return updateChain;
      }),
      returning: jest.fn().mockResolvedValue([]),
    };
    mockUpdate.mockReturnValue(updateChain);

    const { discardPendingExpense } = await import("@/email-inbound/actions");
    await discardPendingExpense({ pendingExpenseId: UUID_PENDING });

    const { sql, params } = sqlOf(wheres[0]);
    expect(sql).toContain(`"pending_expense"."created_by_user_id" = $`);
    expect(params).toContain(UUID_USER);
  });
});
