/**
 * @jest-environment node
 *
 * Integration tests for settleBalanceItem from @/balances/actions
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440010";
const UUID_OTHER = "550e8400-e29b-41d4-a716-446655440011";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440012";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440013";
const PERIOD = "2026-04";

// --- Mocks ---

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "user@test.com" }),
}));

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
  getHouseholdMembers: jest.fn().mockResolvedValue([
    { id: "m1", userId: UUID_USER, role: "owner", displayName: "User" },
    { id: "m2", userId: UUID_OTHER, role: "member", displayName: "Other" },
  ]),
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockTxInsert = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    transaction: mockTransaction,
  },
}));

// Helper: build a chainable select that resolves to `rows`
function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

// Helper: build a chainable insert that resolves (or throws)
function insertChain(err?: Error) {
  const values = err
    ? jest.fn().mockRejectedValue(err)
    : jest.fn().mockResolvedValue([{}]);
  return { values };
}

const EXPENSE_ROW = {
  id: UUID_EXPENSE,
  householdId: UUID_HOUSEHOLD,
  amount: "100.00",
  type: "fixed",
  installmentAmount: null,
};

describe("settleBalanceItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ insert: mockTxInsert })
    );
  });

  it("returns error when user has no household", async () => {
    const { getUserHousehold } = await import("@/household/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce(null);

    const { settleBalanceItem } = await import("@/balances/actions");
    const result = await settleBalanceItem(UUID_EXPENSE, PERIOD, UUID_OTHER);
    expect(result.error).toBe("No tienes un hogar activo");
  });

  it("returns error when debtor is not a household member", async () => {
    const { settleBalanceItem } = await import("@/balances/actions");
    const result = await settleBalanceItem(UUID_EXPENSE, PERIOD, "550e8400-e29b-41d4-a716-4466554400ff");
    expect(result).toEqual({ error: "El deudor no pertenece al hogar" });
  });

  it("returns error when expense not found", async () => {
    // getHouseholdMembers uses its module mock (2 members) → debtor válido
    // 1st (y único) select: expense → not found
    mockSelect.mockReturnValueOnce(selectChain([])); // expense check

    const { settleBalanceItem } = await import("@/balances/actions");
    const result = await settleBalanceItem(UUID_EXPENSE, PERIOD, UUID_OTHER);
    expect(result).toEqual({ error: "Gasto no encontrado" });
  });

  it("N-member: inserts payment for the explicit debtor (current user)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([EXPENSE_ROW])); // expense found

    mockInsert.mockReturnValueOnce(insertChain());

    const { settleBalanceItem } = await import("@/balances/actions");
    const result = await settleBalanceItem(UUID_EXPENSE, PERIOD, UUID_USER);

    expect(result).toEqual({});

    const insertedValues = mockInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(insertedValues.paidBy).toBe(UUID_USER);
    // reparto = monto / nº miembros = 100 / 2
    expect(insertedValues.amount).toBe("50.00");
  });

  it("N-member: inserts payment for the explicit debtor (otro miembro)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([EXPENSE_ROW])); // expense found

    mockInsert.mockReturnValueOnce(insertChain());

    const { settleBalanceItem } = await import("@/balances/actions");
    const result = await settleBalanceItem(UUID_EXPENSE, PERIOD, UUID_OTHER);

    expect(result).toEqual({});

    const insertedValues = mockInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(insertedValues.paidBy).toBe(UUID_OTHER);
  });

  it("returns error on unique constraint violation (already settled)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([EXPENSE_ROW]));

    const uniqueErr = Object.assign(
      new Error('duplicate key value violates unique constraint "uq_expense_period_user"'),
      { code: "23505" }
    );
    mockInsert.mockReturnValueOnce(insertChain(uniqueErr));

    const { settleBalanceItem } = await import("@/balances/actions");
    const result = await settleBalanceItem(UUID_EXPENSE, PERIOD, UUID_OTHER);
    expect(result).toEqual({ error: "Este ítem ya está saldado" });
  });

  // Solo la ruta de invocación: los cross-route son redundantes bajo
  // cacheComponents (las navegaciones dinámicas re-fetchean siempre).
  it("revalidates only the invoking route on success", async () => {
    mockSelect.mockReturnValueOnce(selectChain([EXPENSE_ROW]));

    mockInsert.mockReturnValueOnce(insertChain());

    const { settleBalanceItem } = await import("@/balances/actions");
    await settleBalanceItem(UUID_EXPENSE, PERIOD, UUID_OTHER);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/balances");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
  });
});

describe("settleAllWithMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ insert: mockTxInsert })
    );
  });

  const ITEM_1 = { expenseId: UUID_EXPENSE, periodMonth: PERIOD, debtorId: UUID_OTHER };
  const ITEM_2 = { expenseId: "550e8400-e29b-41d4-a716-446655440014", periodMonth: PERIOD, debtorId: UUID_USER };

  it("returns {} without touching the DB when items is empty", async () => {
    const { settleAllWithMember } = await import("@/balances/actions");
    const result = await settleAllWithMember([]);
    expect(result).toEqual({});
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects when any debtor is not a household member", async () => {
    const { settleAllWithMember } = await import("@/balances/actions");
    const result = await settleAllWithMember([
      ITEM_1,
      { ...ITEM_2, debtorId: "550e8400-e29b-41d4-a716-4466554400ff" },
    ]);
    expect(result).toEqual({ error: "El deudor no pertenece al hogar" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("settles multiple items across both directions in a single transaction", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([EXPENSE_ROW])) // computeShareAmount item 1
      .mockReturnValueOnce(selectChain([{ ...EXPENSE_ROW, id: ITEM_2.expenseId }])); // item 2
    mockTxInsert.mockReturnValue(insertChain());

    const { settleAllWithMember } = await import("@/balances/actions");
    const result = await settleAllWithMember([ITEM_1, ITEM_2]);

    expect(result).toEqual({});
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
    // insertChain() se llama una sola vez (mockReturnValue) → mismo objeto en
    // ambas invocaciones de tx.insert → las dos llamadas a .values() quedan
    // en el mismo mock, en orden.
    const valuesMock = mockTxInsert.mock.results[0].value.values as jest.Mock;
    expect(valuesMock.mock.calls[0][0].paidBy).toBe(UUID_OTHER);
    expect(valuesMock.mock.calls[1][0].paidBy).toBe(UUID_USER);
  });

  it("aborts and returns error when one of the expenses no longer exists", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([EXPENSE_ROW])) // item 1 found
      .mockReturnValueOnce(selectChain([])); // item 2 not found

    const { settleAllWithMember } = await import("@/balances/actions");
    const result = await settleAllWithMember([ITEM_1, ITEM_2]);

    expect(result).toEqual({ error: "Alguno de los gastos ya no existe" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns a distinct error on unique constraint violation (race with another settle)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([EXPENSE_ROW]))
      .mockReturnValueOnce(selectChain([{ ...EXPENSE_ROW, id: ITEM_2.expenseId }]));

    const uniqueErr = Object.assign(
      new Error('duplicate key value violates unique constraint "uq_expense_period_user"'),
      { code: "23505" }
    );
    mockTransaction.mockImplementationOnce(async () => {
      throw uniqueErr;
    });

    const { settleAllWithMember } = await import("@/balances/actions");
    const result = await settleAllWithMember([ITEM_1, ITEM_2]);

    expect(result).toEqual({
      error: "Alguno de los ítems ya estaba saldado — refrescá la página e intentá de nuevo.",
    });
  });
});
