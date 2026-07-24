/**
 * @jest-environment node
 *
 * Integration tests for the pending-balance guard on deleteExpense
 * (@/compras/actions) and deleteFixedExpense (@/gastos-fijos/actions).
 * Bug B4: soft-deleting a shared expense with unsettled debt must be blocked,
 * otherwise the debt silently disappears from balances.
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440040";
const UUID_OTHER = "550e8400-e29b-41d4-a716-446655440041";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440042";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440043";

// --- Mocks ---

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "user@test.com" }),
}));

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test", role: "owner" }),
  getHouseholdMembers: jest.fn().mockResolvedValue([
    { id: "m1", userId: UUID_USER, role: "owner", displayName: "User" },
    { id: "m2", userId: UUID_OTHER, role: "member", displayName: "Other" },
  ]),
}));

const mockGetPendingBalances = jest.fn();
jest.mock("@/balances/queries", () => ({
  getPendingBalances: mockGetPendingBalances,
}));

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

// deleteExpense no usa returning — where() resuelve directo
function updateChain() {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

const DEBT_BALANCE = [
  {
    memberId: UUID_OTHER,
    memberName: "Other",
    net: 15000,
    items: [
      {
        expenseId: UUID_EXPENSE,
        description: "Luz",
        type: "fixed",
        totalAmount: 30000,
        shareAmount: 15000,
        payerId: UUID_USER,
        debtorId: UUID_OTHER,
        periodMonth: "2026-06-01",
      },
    ],
  },
];

describe("deleteExpense (compras)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks deletion when the expense has unsettled debt", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ createdBy: UUID_USER }]));
    mockGetPendingBalances.mockResolvedValueOnce(DEBT_BALANCE);

    const { deleteExpense } = await import("@/compras/actions");
    const result = await deleteExpense(UUID_EXPENSE);

    expect(result.error).toMatch(/sin saldar/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows deletion when no debt references the expense", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ createdBy: UUID_USER }]));
    mockGetPendingBalances.mockResolvedValueOnce([]);
    mockUpdate.mockReturnValueOnce(updateChain());

    const { deleteExpense } = await import("@/compras/actions");
    const result = await deleteExpense(UUID_EXPENSE);

    expect(result).toEqual({});
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith(`${UUID_HOUSEHOLD}:expenses`);
  });

  it("allows deletion when debt exists but for OTHER expenses", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ createdBy: UUID_USER }]));
    mockGetPendingBalances.mockResolvedValueOnce([
      {
        ...DEBT_BALANCE[0],
        items: [{ ...DEBT_BALANCE[0].items[0], expenseId: "otro-expense-id" }],
      },
    ]);
    mockUpdate.mockReturnValueOnce(updateChain());

    const { deleteExpense } = await import("@/compras/actions");
    const result = await deleteExpense(UUID_EXPENSE);

    expect(result).toEqual({});
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("still enforces the createdBy permission check", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ createdBy: UUID_OTHER }]));

    const { deleteExpense } = await import("@/compras/actions");
    const result = await deleteExpense(UUID_EXPENSE);

    expect(result.error).toMatch(/permiso/i);
    expect(mockGetPendingBalances).not.toHaveBeenCalled();
  });
});

describe("deleteFixedExpense (gastos-fijos)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks deletion when the expense has unsettled debt", async () => {
    mockGetPendingBalances.mockResolvedValueOnce(DEBT_BALANCE);

    const { deleteFixedExpense } = await import("@/gastos-fijos/actions");
    const result = await deleteFixedExpense(UUID_EXPENSE);

    expect(result.error).toMatch(/sin saldar/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows deletion when no debt references the expense", async () => {
    mockGetPendingBalances.mockResolvedValueOnce([]);
    mockUpdate.mockReturnValueOnce({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: UUID_EXPENSE }]),
      }),
    });

    const { deleteFixedExpense } = await import("@/gastos-fijos/actions");
    const result = await deleteFixedExpense(UUID_EXPENSE);

    expect(result).toEqual({});
    expect(mockUpdate).toHaveBeenCalled();
  });
});
