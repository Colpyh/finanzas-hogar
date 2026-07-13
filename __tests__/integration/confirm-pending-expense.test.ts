/**
 * @jest-environment node
 *
 * Integration tests for confirmPendingExpense and discardPendingExpense
 * from @/email-inbound/actions
 */
export {};

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

jest.mock("@/onboarding/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
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

  it("throws ZodError on invalid input (missing required fields)", async () => {
    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await expect(confirmPendingExpense({} as never)).rejects.toThrow();
  });

  it("throws ZodError on invalid UUID", async () => {
    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await expect(
      confirmPendingExpense({ pendingExpenseId: "not-a-uuid", categoryId: UUID_CATEGORY, description: "Test" })
    ).rejects.toThrow();
  });

  it("throws when no household", async () => {
    const { getUserHousehold } = await import("@/onboarding/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce(null);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await expect(confirmPendingExpense(VALID_INPUT)).rejects.toThrow("No household");
  });

  it("throws when pending expense not found in transaction", async () => {
    const chain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockTxSelect.mockReturnValue(chain);

    const { confirmPendingExpense } = await import("@/email-inbound/actions");
    await expect(confirmPendingExpense(VALID_INPUT)).rejects.toThrow(
      "Pending expense not found or already processed"
    );
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
});

describe("discardPendingExpense", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws ZodError on invalid UUID", async () => {
    const { discardPendingExpense } = await import("@/email-inbound/actions");
    await expect(
      discardPendingExpense({ pendingExpenseId: "not-a-uuid" })
    ).rejects.toThrow();
  });

  it("throws when no household", async () => {
    const { getUserHousehold } = await import("@/onboarding/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce(null);

    const { discardPendingExpense } = await import("@/email-inbound/actions");
    await expect(
      discardPendingExpense({ pendingExpenseId: UUID_PENDING })
    ).rejects.toThrow("No household");
  });

  it("throws when pending expense not found (0 rows updated)", async () => {
    const updateChain = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    };
    mockUpdate.mockReturnValue(updateChain);

    const { discardPendingExpense } = await import("@/email-inbound/actions");
    await expect(
      discardPendingExpense({ pendingExpenseId: UUID_PENDING })
    ).rejects.toThrow("Pending expense not found or already processed");
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
});
