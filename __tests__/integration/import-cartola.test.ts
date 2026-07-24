/**
 * @jest-environment node
 *
 * Tests de importCartola: filtra no-gastos y deduplica contra lo ya existente.
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-4466554400a0";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-4466554400a1";

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER }),
}));
jest.mock("@/onboarding/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
}));

const mockExtract = jest.fn();
jest.mock("@/cartola/gemini", () => ({ extractCartolaMovements: mockExtract }));

const mockSelect = jest.fn();
const mockInsert = jest.fn();
jest.mock("@/shared/lib/db", () => ({ db: { select: mockSelect, insert: mockInsert } }));

function selectResolving(rows: unknown[]) {
  return { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue(rows) };
}

describe("importCartola", () => {
  beforeEach(() => jest.clearAllMocks());

  it("importa solo gastos, deduplica por monto+fecha y omite no-gastos", async () => {
    mockExtract.mockResolvedValueOnce([
      { fecha: "2026-07-03", descripcion: "JUMBO", monto: 45990, tipo: "gasto" }, // dup (existe pendiente a 1 día)
      { fecha: "2026-07-10", descripcion: "FARMACIA", monto: 10000, tipo: "gasto" }, // nuevo
      { fecha: "2026-07-01", descripcion: "SUELDO", monto: 1500000, tipo: "ingreso" }, // omitido
      { fecha: "2026-07-02", descripcion: "TRASPASO", monto: 50000, tipo: "transferencia" }, // omitido
    ]);

    // Existente: un pendiente de 45990 el 2026-07-04 → dedup del primer gasto.
    mockSelect
      .mockReturnValueOnce(selectResolving([{ amount: "45990.00", date: "2026-07-04" }])) // pending
      .mockReturnValueOnce(selectResolving([])); // expenses

    const insertChain = {
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: "new-1" }]),
    };
    mockInsert.mockReturnValue(insertChain);

    const { importCartola } = await import("@/cartola/actions");
    const result = await importCartola("cGRm");

    expect(result).toEqual({ imported: 1, duplicates: 1, nonExpenses: 2 });

    // Solo se insertó el gasto NO duplicado (FARMACIA).
    const inserted = insertChain.values.mock.calls[0][0];
    expect(inserted).toHaveLength(1);
    expect(inserted[0].parsedMerchant).toBe("FARMACIA");
    expect(inserted[0].parsedAmount).toBe("10000");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gastos-pendientes");
  });

  it("devuelve error si la cartola no se pudo leer", async () => {
    mockExtract.mockResolvedValueOnce(null);
    const { importCartola } = await import("@/cartola/actions");
    const result = await importCartola("cGRm");
    expect(result.error).toMatch(/no se pudo leer/i);
  });

  it("no inserta nada si no hay gastos (solo ingresos/transferencias)", async () => {
    mockExtract.mockResolvedValueOnce([
      { fecha: "2026-07-01", descripcion: "SUELDO", monto: 1500000, tipo: "ingreso" },
    ]);
    const { importCartola } = await import("@/cartola/actions");
    const result = await importCartola("cGRm");
    expect(result).toEqual({ imported: 0, duplicates: 0, nonExpenses: 1 });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
