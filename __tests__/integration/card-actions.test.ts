/**
 * @jest-environment node
 *
 * Integration tests for addCard/updateCard: debit cards must not carry
 * billing-cycle days (closingDay/paymentDueDay) — they have no statement.
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440070";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440071";
const UUID_CARD = "550e8400-e29b-41d4-a716-446655440072";

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "user@test.com" }),
}));

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
}));

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
  },
}));

function insertChain() {
  return { values: jest.fn().mockResolvedValue([{}]) };
}

function updateChain() {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

const DEBIT_INPUT = {
  name: "Débito BCI",
  lastFour: "7566",
  color: "#2563eb",
  kind: "debit",
  // El usuario podría mandar días por error — deben ignorarse para débito
  closingDay: 25,
  paymentDueDay: 10,
};

describe("addCard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores kind and clears billing days for debit cards", async () => {
    mockInsert.mockReturnValueOnce(insertChain());

    const { addCard } = await import("@/tarjetas/actions");
    const result = await addCard(DEBIT_INPUT);

    expect(result).toEqual({});
    const values = mockInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(values.kind).toBe("debit");
    expect(values.closingDay).toBeNull();
    expect(values.paymentDueDay).toBeNull();
  });

  it("keeps billing days for credit cards", async () => {
    mockInsert.mockReturnValueOnce(insertChain());

    const { addCard } = await import("@/tarjetas/actions");
    const result = await addCard({ ...DEBIT_INPUT, kind: "credit" });

    expect(result).toEqual({});
    const values = mockInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(values.kind).toBe("credit");
    expect(values.closingDay).toBe(25);
    expect(values.paymentDueDay).toBe(10);
  });

  it("defaults kind to credit when not provided", async () => {
    mockInsert.mockReturnValueOnce(insertChain());

    const { addCard } = await import("@/tarjetas/actions");
    const { kind: _kind, ...withoutKind } = DEBIT_INPUT;
    await addCard(withoutKind);

    const values = mockInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(values.kind).toBe("credit");
  });
});

describe("updateCard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("clears billing days when switching a card to debit", async () => {
    mockUpdate.mockReturnValueOnce(updateChain());

    const { updateCard } = await import("@/tarjetas/actions");
    const result = await updateCard(UUID_CARD, DEBIT_INPUT);

    expect(result).toEqual({});
    const setValues = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
    expect(setValues.kind).toBe("debit");
    expect(setValues.closingDay).toBeNull();
    expect(setValues.paymentDueDay).toBeNull();
  });
});
