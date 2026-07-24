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

jest.mock("@/onboarding/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
}));

jest.mock("@/household/queries", () => ({
  getHouseholdMembers: jest.fn().mockResolvedValue([
    { id: "m1", userId: UUID_USER, role: "owner", displayName: "User" },
    { id: "m2", userId: UUID_OTHER, role: "member", displayName: "Other" },
  ]),
}));

const mockSyncCounter = jest.fn().mockResolvedValue(undefined);
jest.mock("@/compras/installment-sync", () => ({
  syncSharedInstallmentCounter: mockSyncCounter,
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();

jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
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
  });

  it("returns error when user has no household", async () => {
    const { getUserHousehold } = await import("@/onboarding/queries");
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

    const uniqueErr = new Error('duplicate key value violates unique constraint "uq_expense_period_user"');
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
