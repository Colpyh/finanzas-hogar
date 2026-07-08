/**
 * @jest-environment node
 *
 * Tests for syncSharedInstallmentCounter (bug B2: shared installments
 * never incremented installmentsPaid, so they stayed "active" forever).
 */
export {};

const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440060";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440061";
const PERIOD = "2026-07-01";

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

function selectChain(rows: unknown[], withLimit = true) {
  const chain: Record<string, jest.Mock> = {
    from: jest.fn().mockReturnThis(),
  };
  if (withLimit) {
    chain.where = jest.fn().mockReturnThis();
    chain.limit = jest.fn().mockResolvedValue(rows);
  } else {
    chain.where = jest.fn().mockResolvedValue(rows);
  }
  return chain;
}

function updateChain() {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

describe("syncSharedInstallmentCounter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing for non-installment expenses", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ type: "fixed" }]));

    const { syncSharedInstallmentCounter } = await import("@/compras/installment-sync");
    await syncSharedInstallmentCounter(UUID_EXPENSE, UUID_HOUSEHOLD, PERIOD, 2);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does nothing while the month is incomplete (paidCount < memberCount)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ type: "installment" }]))
      .mockReturnValueOnce(selectChain([{ id: "p1" }], false)); // 1 pago de 2

    const { syncSharedInstallmentCounter } = await import("@/compras/installment-sync");
    await syncSharedInstallmentCounter(UUID_EXPENSE, UUID_HOUSEHOLD, PERIOD, 2);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("increments the counter when all members paid the month", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ type: "installment" }]))
      .mockReturnValueOnce(selectChain([{ id: "p1" }, { id: "p2" }], false));
    mockUpdate.mockReturnValueOnce(updateChain());

    const { syncSharedInstallmentCounter } = await import("@/compras/installment-sync");
    await syncSharedInstallmentCounter(UUID_EXPENSE, UUID_HOUSEHOLD, PERIOD, 2);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the expense does not exist", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { syncSharedInstallmentCounter } = await import("@/compras/installment-sync");
    await syncSharedInstallmentCounter(UUID_EXPENSE, UUID_HOUSEHOLD, PERIOD, 2);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
