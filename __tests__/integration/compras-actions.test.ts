/**
 * @jest-environment node
 *
 * Integration tests for markInstallmentPaid (atomic counter, bug B7)
 * and toggleExpensePaid validation (bug B8) from @/compras/actions.
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440050";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440051";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440052";

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
  ]),
}));

jest.mock("@/balances/guards", () => ({
  pendingDebtGuard: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/compras/installment-sync", () => ({
  syncSharedInstallmentCounter: jest.fn().mockResolvedValue(undefined),
}));

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

function updateReturningChain(rows: unknown[]) {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(rows),
    }),
  };
}

describe("markInstallmentPaid (atomic counter)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments atomically in a single UPDATE (no read-modify-write)", async () => {
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ paid: 4 }]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);

    expect(result).toEqual({});
    // Un solo UPDATE, sin SELECT previo del contador
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith(UUID_HOUSEHOLD);
  });

  it("returns error when expense not found (0 rows updated, no row exists)", async () => {
    mockUpdate.mockReturnValueOnce(updateReturningChain([]));
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);
    expect(result).toEqual({ error: "Gasto no encontrado" });
  });

  it("returns error when all installments already paid (0 rows updated, row exists)", async () => {
    mockUpdate.mockReturnValueOnce(updateReturningChain([]));
    mockSelect.mockReturnValueOnce(selectChain([{ paid: 12, total: 12 }]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);
    expect(result).toEqual({ error: "Todas las cuotas ya fueron pagadas" });
  });
});

describe("toggleExpensePaid (validation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ONE_TIME_WITH_CARD = {
    paidAt: null,
    type: "one_time",
    cardId: "card-1",
    cardKind: "credit",
  };

  it("toggles a one_time expense with card", async () => {
    mockSelect.mockReturnValueOnce(selectChain([ONE_TIME_WITH_CARD]));
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ id: UUID_EXPENSE }]));

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result).toEqual({});
  });

  it("rejects non one_time expenses", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_WITH_CARD, type: "installment" }])
    );

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result.error).toMatch(/puntuales/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects expenses without a card (auto-paid by definition)", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_WITH_CARD, cardId: null, cardKind: null }])
    );

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result.error).toMatch(/sin tarjeta/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects debit-card expenses (auto-paid, no statement)", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_WITH_CARD, cardKind: "debit" }])
    );

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result.error).toMatch(/débito/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
