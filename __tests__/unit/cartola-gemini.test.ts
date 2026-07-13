/**
 * @jest-environment node
 *
 * Tests del extractor de cartolas con Gemini (fetch mockeado).
 */
export {};

const VALID = {
  movimientos: [
    { fecha: "2026-07-03", descripcion: "JUMBO MAIPU", monto: 45990, tipo: "gasto" },
    { fecha: "2026-07-01", descripcion: "SUELDO", monto: 1500000, tipo: "ingreso" },
  ],
};

function geminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  };
}

describe("extractCartolaMovements", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = "test-key";
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("mapea la respuesta válida y manda el texto de la cartola en el prompt", async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID)));

    const { extractCartolaMovements } = await import("@/cartola/gemini");
    const result = await extractCartolaMovements("03/07 JUMBO MAIPU 45.990");

    expect(result).toEqual(VALID.movimientos);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toContain("JUMBO MAIPU");
  });

  it("devuelve null con JSON inválido", async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiResponse("no json"));
    const { extractCartolaMovements } = await import("@/cartola/gemini");
    expect(await extractCartolaMovements("x")).toBeNull();
  });

  it("devuelve null si un movimiento no cumple el schema (tipo inválido)", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse(JSON.stringify({ movimientos: [{ fecha: "2026-07-01", descripcion: "x", monto: 1, tipo: "raro" }] }))
    );
    const { extractCartolaMovements } = await import("@/cartola/gemini");
    expect(await extractCartolaMovements("x")).toBeNull();
  });

  it("lanza si falta la API key", async () => {
    delete process.env.GEMINI_API_KEY;
    global.fetch = jest.fn();
    const { extractCartolaMovements } = await import("@/cartola/gemini");
    await expect(extractCartolaMovements("x")).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
