/**
 * @jest-environment node
 *
 * Tests para el analizador financiero con Gemini (fetch mockeado).
 */
export {};

const INPUT = {
  mes: "julio 2026",
  ingresoMensual: 1500000,
  totalGastado: 1238480,
  gastoFijo: 808990,
  gastoVariable: 294500,
  gastoCuotas: 134990,
  categorias: [{ nombre: "Alimentación", gastado: 187500, presupuesto: 150000 }],
  cuotasActivas: [{ descripcion: "Notebook", montoMensual: 89990, mesesRestantes: 9 }],
  promedioMensualAnual: 1100000,
  mesMasCaro: { mes: "diciembre 2025", monto: 1600000 },
};

const VALID_INSIGHTS = {
  titular: "Mes bajo control",
  puntos: [
    { tipo: "alerta", texto: "Alimentación superó el presupuesto en $37.500." },
    { tipo: "positivo", texto: "Gastaste menos que tu mes más caro." },
    { tipo: "idea", texto: "En 9 meses liberás $89.990 al terminar el Notebook." },
  ],
};

function geminiResponse(payloadText: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: payloadText }] } }] }),
  };
}

describe("generateFinancialInsights", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("mapea una respuesta válida a FinancialInsights y pide JSON estructurado", async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_INSIGHTS)));

    const { generateFinancialInsights } = await import("@/insights/gemini");
    const result = await generateFinancialInsights(INPUT);

    expect(result).toEqual(VALID_INSIGHTS);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    // Los números del hogar viajan en el prompt.
    expect(body.contents[0].parts[0].text).toContain("1238480");
  });

  it("devuelve null con JSON inválido", async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiResponse("no es json"));
    const { generateFinancialInsights } = await import("@/insights/gemini");
    expect(await generateFinancialInsights(INPUT)).toBeNull();
  });

  it("devuelve null si no cumple el schema (tipo de punto inválido)", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse(JSON.stringify({ titular: "X", puntos: [{ tipo: "raro", texto: "y" }] }))
    );
    const { generateFinancialInsights } = await import("@/insights/gemini");
    expect(await generateFinancialInsights(INPUT)).toBeNull();
  });

  it("devuelve null en error HTTP (rate limit)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const { generateFinancialInsights } = await import("@/insights/gemini");
    expect(await generateFinancialInsights(INPUT)).toBeNull();
  });

  it("lanza si falta GEMINI_API_KEY (error de config, no de datos)", async () => {
    delete process.env.GEMINI_API_KEY;
    global.fetch = jest.fn();
    const { generateFinancialInsights } = await import("@/insights/gemini");
    await expect(generateFinancialInsights(INPUT)).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
