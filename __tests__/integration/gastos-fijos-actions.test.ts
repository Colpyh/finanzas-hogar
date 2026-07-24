/**
 * @jest-environment node
 *
 * Integration tests for markFixedExpensePaid and markPaidForOther
 * from @/gastos-fijos/actions
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440030";
const UUID_OTHER = "550e8400-e29b-41d4-a716-446655440031";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440032";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440033";

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

// currentPeriodMonth is a pure helper — return a fixed value so tests are deterministic
jest.mock("@/shared/lib/db/helpers", () => ({
  currentPeriodMonth: jest.fn().mockReturnValue("2026-04"),
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();

jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

// Helper: chainable select resolving to `rows`
function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

// Helper: chainable insert, optionally throws
function insertChain(err?: Error) {
  const values = err
    ? jest.fn().mockRejectedValue(err)
    : jest.fn().mockResolvedValue([{}]);
  return { values };
}

const EXPENSE_ROW = {
  id: UUID_EXPENSE,
  householdId: UUID_HOUSEHOLD,
  amount: "50.00",
  type: "fixed",
  installmentAmount: null,
};

const VALID_MARK_PAID = {
  expenseId: UUID_EXPENSE,
  amount: "50.00",
  status: "paid",
};

describe("markFixedExpensePaid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error when expense not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { markFixedExpensePaid } = await import("@/gastos-fijos/actions");
    const result = await markFixedExpensePaid(VALID_MARK_PAID);
    expect(result).toEqual({ error: "Gasto no encontrado" });
  });

  it("inserts payment and returns {} on happy path", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: UUID_EXPENSE }]));
    mockInsert.mockReturnValueOnce(insertChain());

    const { markFixedExpensePaid } = await import("@/gastos-fijos/actions");
    const result = await markFixedExpensePaid(VALID_MARK_PAID);

    expect(result).toEqual({});
    expect(mockInsert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastos-fijos");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
  });

  it("returns error on duplicate payment (unique constraint)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: UUID_EXPENSE }]));
    const uniqueErr = new Error('duplicate key value violates unique constraint "uq_expense_period_user"');
    mockInsert.mockReturnValueOnce(insertChain(uniqueErr));

    const { markFixedExpensePaid } = await import("@/gastos-fijos/actions");
    const result = await markFixedExpensePaid(VALID_MARK_PAID);
    expect(result).toEqual({ error: "Ya confirmaste tu pago este mes" });
  });
});

describe("markPaidForOther", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error when no other member in household", async () => {
    const { getHouseholdMembers } = await import("@/household/queries");
    (getHouseholdMembers as jest.Mock).mockResolvedValueOnce([
      { id: "m1", userId: UUID_USER, role: "owner", displayName: "User" },
    ]);

    const { markPaidForOther } = await import("@/gastos-fijos/actions");
    const result = await markPaidForOther(UUID_EXPENSE);
    expect(result).toEqual({ error: "No hay otro miembro en el hogar" });
  });

  it("returns error when expense not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { markPaidForOther } = await import("@/gastos-fijos/actions");
    const result = await markPaidForOther(UUID_EXPENSE);
    expect(result).toEqual({ error: "Gasto no encontrado" });
  });

  it("inserts payment for other member with Marcado por notes", async () => {
    mockSelect.mockReturnValueOnce(selectChain([EXPENSE_ROW]));
    mockInsert.mockReturnValueOnce(insertChain());

    const { markPaidForOther } = await import("@/gastos-fijos/actions");
    const result = await markPaidForOther(UUID_EXPENSE);

    expect(result).toEqual({});
    expect(mockInsert).toHaveBeenCalled();

    const insertedValues = mockInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(insertedValues.paidBy).toBe(UUID_OTHER);
    expect(insertedValues.notes).toContain("Marcado por");
  });

  it("returns error when other member already paid (unique constraint)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([EXPENSE_ROW]));
    const uniqueErr = new Error('duplicate key value violates unique constraint "uq_expense_period_user"');
    mockInsert.mockReturnValueOnce(insertChain(uniqueErr));

    const { markPaidForOther } = await import("@/gastos-fijos/actions");
    const result = await markPaidForOther(UUID_EXPENSE);
    expect(result).toEqual({ error: "El otro miembro ya tiene un pago registrado este mes" });
  });
});
