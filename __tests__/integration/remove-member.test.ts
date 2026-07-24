/**
 * @jest-environment node
 *
 * Integration tests for removeMember from @/household/actions
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440020";
const UUID_OTHER = "550e8400-e29b-41d4-a716-446655440021";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440022";
const UUID_MEMBER_ROW = "550e8400-e29b-41d4-a716-446655440023";

// --- Mocks ---

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  updateTag: mockUpdateTag,
}));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "owner@test.com" }),
}));

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest
    .fn()
    .mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test", role: "owner" }),
  userHouseholdTag: (userId: string) => `user-household-${userId}`,
  getHouseholdMembers: jest.fn().mockResolvedValue([
    { id: "m1", userId: UUID_USER, role: "owner", displayName: "Owner" },
    { id: "m2", userId: UUID_OTHER, role: "member", displayName: "Other" },
  ]),
}));

const mockGetPendingBalances = jest.fn();
jest.mock("@/balances/queries", () => ({
  getPendingBalances: mockGetPendingBalances,
}));

const mockSelect = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    delete: mockDelete,
  },
}));

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

function deleteChain() {
  return { where: jest.fn().mockResolvedValue(undefined) };
}

const TARGET_ROW = {
  id: UUID_MEMBER_ROW,
  householdId: UUID_HOUSEHOLD,
  userId: UUID_OTHER,
  role: "member",
};

describe("removeMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // La action devuelve { error } (no lanza): los mensajes de errores lanzados
  // en Server Actions se redactan en producción y el usuario nunca los ve.
  it("returns error when caller is not owner", async () => {
    const { getUserHousehold } = await import("@/household/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce({
      id: UUID_HOUSEHOLD,
      name: "Test",
      role: "member",
    });

    const { removeMember } = await import("@/household/actions");
    const result = await removeMember(UUID_MEMBER_ROW);
    expect(result.error).toBe("Solo el propietario puede eliminar miembros");
  });

  it("returns error when target member not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { removeMember } = await import("@/household/actions");
    const result = await removeMember(UUID_MEMBER_ROW);
    expect(result.error).toBe("Miembro no encontrado");
  });

  it("blocks removal when target has a pending balance", async () => {
    mockSelect.mockReturnValueOnce(selectChain([TARGET_ROW]));
    mockGetPendingBalances.mockResolvedValueOnce([
      { memberId: UUID_OTHER, memberName: "Other", net: -5000, items: [] },
    ]);

    const { removeMember } = await import("@/household/actions");
    const result = await removeMember(UUID_MEMBER_ROW);
    expect(result.error).toMatch(/saldo pendiente/);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("allows removal when target has no pending balance entry", async () => {
    mockSelect.mockReturnValueOnce(selectChain([TARGET_ROW]));
    mockGetPendingBalances.mockResolvedValueOnce([]);
    mockDelete.mockReturnValueOnce(deleteChain());

    const { removeMember } = await import("@/household/actions");
    const result = await removeMember(UUID_MEMBER_ROW);

    expect(result).toEqual({});
    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith(UUID_HOUSEHOLD);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ajustes");
  });

  it("allows removal when target balance is exactly zero", async () => {
    mockSelect.mockReturnValueOnce(selectChain([TARGET_ROW]));
    mockGetPendingBalances.mockResolvedValueOnce([
      { memberId: UUID_OTHER, memberName: "Other", net: 0, items: [] },
    ]);
    mockDelete.mockReturnValueOnce(deleteChain());

    const { removeMember } = await import("@/household/actions");
    const result = await removeMember(UUID_MEMBER_ROW);

    expect(result).toEqual({});
    expect(mockDelete).toHaveBeenCalled();
  });
});
