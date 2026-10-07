/**
 * @jest-environment node
 *
 * Tests for getSharedInstallmentsPaidCounts / effectiveInstallmentsPaid
 * (installmentsPaid derivado para cuotas COMPARTIDAS — reemplaza el
 * contador incremental que se desincronizaba para siempre al deshacer un
 * pago, porque unmarkOtherPayment/unmarkMyPayment borraban la fila de
 * fixed_expense_payment sin decrementar expense.installmentsPaid).
 */
export {};

const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440070";
const EXPENSE_A = "550e8400-e29b-41d4-a716-446655440071";
const EXPENSE_B = "550e8400-e29b-41d4-a716-446655440072";

jest.mock("next/cache", () => ({ cacheTag: jest.fn() }));

const mockSelect = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: { select: (...args: unknown[]) => mockSelect(...args) },
}));

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(rows),
  };
}

/** Segunda query: cuotas compartidas con ajuste manual (installmentsPaidOffset != 0). */
function offsetsChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(rows),
  };
}

describe("getSharedInstallmentsPaidCounts", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    // Por defecto ningún gasto tiene ajuste manual.
    mockSelect.mockImplementation(() => offsetsChain([]));
  });

  it("counts a period only when ALL members paid it", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([
        { expenseId: EXPENSE_A, periodMonth: "2026-05-01", payers: 2 },
        { expenseId: EXPENSE_A, periodMonth: "2026-06-01", payers: 1 }, // incompleto
        { expenseId: EXPENSE_A, periodMonth: "2026-07-01", payers: 2 },
      ])
    );

    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const counts = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);

    expect(counts.get(EXPENSE_A)).toBe(2);
  });

  it("returns separate counts per expense", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([
        { expenseId: EXPENSE_A, periodMonth: "2026-05-01", payers: 2 },
        { expenseId: EXPENSE_B, periodMonth: "2026-05-01", payers: 2 },
        { expenseId: EXPENSE_B, periodMonth: "2026-06-01", payers: 2 },
      ])
    );

    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const counts = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);

    expect(counts.get(EXPENSE_A)).toBe(1);
    expect(counts.get(EXPENSE_B)).toBe(2);
  });

  it("returns an empty map when there is no paid history", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const counts = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);

    expect(counts.size).toBe(0);
  });

  it("reflects undoing a payment automatically — no decrement logic needed", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ expenseId: EXPENSE_A, periodMonth: "2026-07-01", payers: 2 }])
    );
    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const before = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);
    expect(before.get(EXPENSE_A)).toBe(1);

    // DELETE en fixed_expense_payment (deshacer un pago): la query real ya
    // no ve ese período completo — sin decrementar nada a mano.
    mockSelect.mockReturnValueOnce(
      selectChain([{ expenseId: EXPENSE_A, periodMonth: "2026-07-01", payers: 1 }])
    );
    const after = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);
    expect(after.get(EXPENSE_A) ?? 0).toBe(0);
  });
});

describe("getSharedInstallmentsPaidCounts — ajuste manual (offset)", () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it("suma el ajuste al conteo derivado de los pagos", async () => {
    mockSelect
      .mockReturnValueOnce(
        selectChain([
          { expenseId: EXPENSE_A, periodMonth: "2026-06-01", payers: 2 },
          { expenseId: EXPENSE_A, periodMonth: "2026-07-01", payers: 2 },
        ])
      )
      .mockReturnValueOnce(offsetsChain([{ id: EXPENSE_A, offset: 4, total: 12 }]));

    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const counts = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);

    expect(counts.get(EXPENSE_A)).toBe(6);
  });

  it("aplica el ajuste aunque todavía no haya pagos registrados", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([]))
      .mockReturnValueOnce(offsetsChain([{ id: EXPENSE_B, offset: 3, total: 12 }]));

    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const counts = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);

    expect(counts.get(EXPENSE_B)).toBe(3);
  });

  it("acota el resultado a [0, total]", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ expenseId: EXPENSE_A, periodMonth: "2026-07-01", payers: 2 }]))
      .mockReturnValueOnce(
        offsetsChain([
          { id: EXPENSE_A, offset: 20, total: 12 },
          { id: EXPENSE_B, offset: -5, total: 12 },
        ])
      );

    const { getSharedInstallmentsPaidCounts } = await import("@/shared/lib/db/installments");
    const counts = await getSharedInstallmentsPaidCounts(UUID_HOUSEHOLD, 2);

    expect(counts.get(EXPENSE_A)).toBe(12);
    expect(counts.get(EXPENSE_B)).toBe(0);
  });
});

describe("effectiveInstallmentsPaid", () => {
  it("uses the derived count for shared installments", async () => {
    const { effectiveInstallmentsPaid } = await import("@/shared/lib/db/installments");
    const result = effectiveInstallmentsPaid(
      { id: EXPENSE_A, isShared: true, installmentsPaid: 999 },
      new Map([[EXPENSE_A, 5]])
    );
    expect(result).toBe(5);
  });

  it("falls back to 0 when a shared installment has no entry in the map", async () => {
    const { effectiveInstallmentsPaid } = await import("@/shared/lib/db/installments");
    const result = effectiveInstallmentsPaid(
      { id: EXPENSE_B, isShared: true, installmentsPaid: 3 },
      new Map()
    );
    expect(result).toBe(0);
  });

  it("uses the stored column for non-shared installments", async () => {
    const { effectiveInstallmentsPaid } = await import("@/shared/lib/db/installments");
    const result = effectiveInstallmentsPaid(
      { id: EXPENSE_A, isShared: false, installmentsPaid: 7 },
      new Map([[EXPENSE_A, 999]])
    );
    expect(result).toBe(7);
  });
});
