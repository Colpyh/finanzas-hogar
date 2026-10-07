/**
 * @jest-environment node
 *
 * Loop de chat con function calling de Gemini (fetch mockeado).
 */
export {};

jest.mock("server-only", () => ({}));

function geminiParts(parts: object[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { role: "model", parts } }] }),
  };
}

const TOOLS = [{ name: "resumen_mes", description: "x" }];
const HISTORY = [{ role: "user" as const, text: "¿Cuánto gasté este mes?" }];

describe("runChat", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("ejecuta la herramienta pedida y devuelve el texto final", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        geminiParts([{ functionCall: { name: "resumen_mes", args: { mes: "2026-10" } }, thoughtSignature: "sig" }])
      )
      .mockResolvedValueOnce(geminiParts([{ text: "Llevas $500.000." }]));
    const executeTool = jest.fn().mockResolvedValue({ gastoTotal: 500000 });

    const { runChat } = await import("@/chat/gemini");
    const result = await runChat({ system: "sys", history: HISTORY, tools: TOOLS, executeTool });

    expect(result).toEqual({ ok: true, text: "Llevas $500.000." });
    expect(executeTool).toHaveBeenCalledWith("resumen_mes", { mes: "2026-10" });

    const secondBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    // El turno del modelo vuelve intacto (thoughtSignature) + la respuesta de la herramienta.
    expect(secondBody.contents[1]).toEqual({
      role: "model",
      parts: [{ functionCall: { name: "resumen_mes", args: { mes: "2026-10" } }, thoughtSignature: "sig" }],
    });
    expect(secondBody.contents[2]).toEqual({
      role: "user",
      parts: [{ functionResponse: { name: "resumen_mes", response: { gastoTotal: 500000 } } }],
    });
    expect(secondBody.systemInstruction.parts[0].text).toBe("sys");
  });

  it("ignora las partes de razonamiento (thought) en el texto final", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(geminiParts([{ text: "pensando...", thought: true }, { text: "Respuesta" }]));
    const { runChat } = await import("@/chat/gemini");
    const result = await runChat({ system: "s", history: HISTORY, tools: TOOLS, executeTool: jest.fn() });
    expect(result).toEqual({ ok: true, text: "Respuesta" });
  });

  it("fuerza texto (mode NONE) en la última vuelta para no quedar en loop", async () => {
    const call = geminiParts([{ functionCall: { name: "resumen_mes", args: {} } }]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce(geminiParts([{ text: "Listo" }]));
    const { runChat } = await import("@/chat/gemini");
    const result = await runChat({
      system: "s",
      history: HISTORY,
      tools: TOOLS,
      executeTool: jest.fn().mockResolvedValue({}),
      maxToolRounds: 2,
    });

    expect(result).toEqual({ ok: true, text: "Listo" });
    const modes = (global.fetch as jest.Mock).mock.calls.map(
      (c) => JSON.parse(c[1].body).toolConfig.functionCallingConfig.mode
    );
    expect(modes).toEqual(["AUTO", "AUTO", "NONE"]);
  });

  it("distingue el límite de cuota (429) de otros fallos", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    const { runChat } = await import("@/chat/gemini");
    expect(await runChat({ system: "s", history: HISTORY, tools: TOOLS, executeTool: jest.fn() })).toEqual({
      ok: false,
      reason: "quota",
    });

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await runChat({ system: "s", history: HISTORY, tools: TOOLS, executeTool: jest.fn() })).toEqual({
      ok: false,
      reason: "failed",
    });
  });

  it("lanza solo si falta la API key", async () => {
    delete process.env.GEMINI_API_KEY;
    const { runChat } = await import("@/chat/gemini");
    await expect(
      runChat({ system: "s", history: HISTORY, tools: TOOLS, executeTool: jest.fn() })
    ).rejects.toThrow("GEMINI_API_KEY");
  });
});
