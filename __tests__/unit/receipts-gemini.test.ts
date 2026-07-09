/**
 * @jest-environment node
 *
 * Tests for the Gemini receipt extractor (mocked fetch).
 */
export {};

const VALID_EXTRACTION = {
  merchant: "LIDER EXPRESS",
  total: 5480,
  date: "2026-07-09",
  items: [
    { description: "Pan de molde integral", quantity: 1, total: 2190 },
    { description: "Leche entera 1L", quantity: 2, total: 3290 },
  ],
};

function geminiResponse(payloadText: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: payloadText }] } },
      ],
    }),
  };
}

describe("extractReceiptWithGemini", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps a valid Gemini JSON response to ExtractedReceipt", async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_EXTRACTION)));

    const { extractReceiptWithGemini } = await import("@/receipts/gemini");
    const result = await extractReceiptWithGemini("base64data", "image/jpeg");

    expect(result).toEqual(VALID_EXTRACTION);
    // La request lleva la imagen inline y pide JSON estructurado
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts.some((p: { inline_data?: unknown }) => p.inline_data)).toBe(true);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("returns null when Gemini responds with invalid JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiResponse("esto no es json"));

    const { extractReceiptWithGemini } = await import("@/receipts/gemini");
    expect(await extractReceiptWithGemini("base64data", "image/jpeg")).toBeNull();
  });

  it("returns null when the JSON does not match the schema", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      geminiResponse(JSON.stringify({ merchant: "X", total: -5, date: "hoy", items: [] }))
    );

    const { extractReceiptWithGemini } = await import("@/receipts/gemini");
    expect(await extractReceiptWithGemini("base64data", "image/jpeg")).toBeNull();
  });

  it("returns null on HTTP error (rate limit, etc.)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    const { extractReceiptWithGemini } = await import("@/receipts/gemini");
    expect(await extractReceiptWithGemini("base64data", "image/jpeg")).toBeNull();
  });

  it("throws when GEMINI_API_KEY is missing (error de config, no de datos)", async () => {
    delete process.env.GEMINI_API_KEY;
    global.fetch = jest.fn();

    const { extractReceiptWithGemini } = await import("@/receipts/gemini");
    await expect(extractReceiptWithGemini("base64data", "image/jpeg")).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
