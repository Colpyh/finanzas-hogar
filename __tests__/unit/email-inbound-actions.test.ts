/**
 * Tests for confirmPendingExpense and discardPendingExpense
 * Covers spec scenarios for actions
 */
export {};

const UUID_PENDING = "550e8400-e29b-41d4-a716-446655440001";
const UUID_CATEGORY = "550e8400-e29b-41d4-a716-446655440002";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440003";
const UUID_USER = "550e8400-e29b-41d4-a716-446655440004";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440005";

// Mock revalidatePath / updateTag
const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

// Mock auth
jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER }),
}));
jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
}));

// Mock db
const mockTxSelect = jest.fn();
const mockTxInsert = jest.fn();
const mockTxUpdate = jest.fn();
const mockTransaction = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/shared/lib/db", () => ({
  db: {
    transaction: mockTransaction,
    select: mockSelect,
    update: mockUpdate,
  },
}));

describe("confirmPendingExpense", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: transaction calls callback with tx object
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        select: mockTxSelect,
        insert: mockTxInsert,
        update: mockTxUpdate,
      };
      return cb(tx);
    });
  });

  it("returns error on invalid UUID input", async () => {
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

  it("returns error on empty description", async () => {
    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense({
      pendingExpenseId: UUID_PENDING,
      categoryId: UUID_CATEGORY,
      description: "",
      amount: "4000.00",
      expenseDate: "2026-04-19",
    });
    expect(result.error).toBeTruthy();
  });

  it("returns error when pending expense not found", async () => {
    // tx.select().from().where().limit() returns empty array
    const chainMock = { from: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockTxSelect.mockReturnValue(chainMock);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    const result = await confirmPendingExpense({
      pendingExpenseId: UUID_PENDING,
      categoryId: UUID_CATEGORY,
      description: "MUNICH",
      amount: "4000.00",
      expenseDate: "2026-04-19",
    });
    expect(result.error).toBe("Este gasto pendiente ya fue procesado o no existe");
  });

  it("inserts expense and updates pending on success", async () => {
    const pendingRow = {
      id: UUID_PENDING,
      householdId: UUID_HOUSEHOLD,
      parsedAmount: "4000.00",
      parsedDate: "2026-04-19",
      status: "pending",
    };

    // First select (fetch pending): returns pendingRow
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([pendingRow]),
    };
    mockTxSelect.mockReturnValue(selectChain);

    // insert expense
    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
    };
    mockTxInsert.mockReturnValue(insertChain);

    // update pending_expense
    const updateChain = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: UUID_PENDING }]),
    };
    mockTxUpdate.mockReturnValue(updateChain);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await confirmPendingExpense({
      pendingExpenseId: UUID_PENDING,
      categoryId: UUID_CATEGORY,
      description: "MUNICH",
      amount: "4000.00",
      expenseDate: "2026-04-19",
    });

    expect(mockTxInsert).toHaveBeenCalled();
    expect(mockTxUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastos-pendientes");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
  });
});

describe("discardPendingExpense", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error on invalid UUID input", async () => {
    const { discardPendingExpense } = await import("@/email-inbound/actions");
    const result = await discardPendingExpense({ pendingExpenseId: "not-a-uuid" });
    expect(result.error).toBeTruthy();
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

  it("updates status to discarded and revalidates on success", async () => {
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
});
