/**
 * Tests para suggestCategoryByMerchant y normalizeMerchant
 * de @/email-inbound/queries
 */
export {};

const CAT_SUPER = "550e8400-e29b-41d4-a716-446655440101";
const CAT_OCIO = "550e8400-e29b-41d4-a716-446655440102";
const HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440199";

const mockSelect = jest.fn();
jest.mock("@/shared/lib/db", () => ({ db: { select: mockSelect } }));

// Chain que resuelve en orderBy con las filas provistas.
function mockRows(rows: unknown[]) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

describe("normalizeMerchant", () => {
  it("minúsculas, trim y colapsa espacios", async () => {
    const { normalizeMerchant } = await import("@/email-inbound/queries");
    expect(normalizeMerchant("  JUMBO   MAIPU ")).toBe("jumbo maipu");
  });
});

describe("suggestCategoryByMerchant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no consulta la DB si no hay merchants", async () => {
    const { suggestCategoryByMerchant } = await import("@/email-inbound/queries");
    const result = await suggestCategoryByMerchant(HOUSEHOLD, []);
    expect(result).toEqual({});
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("elige la categoría con más ocurrencias por merchant (primera en orden desc)", async () => {
    mockRows([
      { merchant: "jumbo maipu", categoryId: CAT_SUPER, n: 5 },
      { merchant: "jumbo maipu", categoryId: CAT_OCIO, n: 1 },
      { merchant: "steam", categoryId: CAT_OCIO, n: 3 },
    ]);
    const { suggestCategoryByMerchant } = await import("@/email-inbound/queries");
    const result = await suggestCategoryByMerchant(HOUSEHOLD, ["Jumbo Maipu", "STEAM"]);
    expect(result).toEqual({
      "jumbo maipu": CAT_SUPER,
      steam: CAT_OCIO,
    });
  });

  it("devuelve {} cuando el merchant no tiene historial", async () => {
    mockRows([]);
    const { suggestCategoryByMerchant } = await import("@/email-inbound/queries");
    const result = await suggestCategoryByMerchant(HOUSEHOLD, ["Comercio nuevo"]);
    expect(result).toEqual({});
  });
});
