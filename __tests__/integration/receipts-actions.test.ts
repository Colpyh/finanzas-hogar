/**
 * @jest-environment node
 *
 * Integration tests for analyzeReceipt (@/receipts/actions).
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440080";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440081";

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "user@test.com" }),
}));

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
}));

const mockExtract = jest.fn();
jest.mock("@/receipts/gemini", () => ({
  extractReceiptWithGemini: mockExtract,
}));

const mockUpload = jest.fn();
jest.mock("@/shared/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    storage: {
      from: jest.fn().mockReturnValue({
        upload: mockUpload,
      }),
    },
  }),
}));

const EXTRACTION = {
  merchant: "LIDER EXPRESS",
  total: 5480,
  date: "2026-07-09",
  items: [
    { description: "Pan", quantity: 1, total: 2190 },
    { description: "Leche", quantity: 2, total: 3290 },
  ],
};

describe("analyzeReceipt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns extraction + imagePath + itemsMatchTotal on happy path", async () => {
    mockExtract.mockResolvedValueOnce(EXTRACTION);
    mockUpload.mockResolvedValueOnce({ data: { path: "x" }, error: null });

    const { analyzeReceipt } = await import("@/receipts/actions");
    const result = await analyzeReceipt("aGVsbG8=", "image/jpeg");

    expect(result.error).toBeUndefined();
    expect(result.receipt).toEqual(EXTRACTION);
    expect(result.itemsMatchTotal).toBe(true);
    expect(result.imagePath).toMatch(new RegExp(`^${UUID_HOUSEHOLD}/`));
  });

  it("flags itemsMatchTotal=false when the detail does not add up", async () => {
    mockExtract.mockResolvedValueOnce({ ...EXTRACTION, total: 99999 });
    mockUpload.mockResolvedValueOnce({ data: { path: "x" }, error: null });

    const { analyzeReceipt } = await import("@/receipts/actions");
    const result = await analyzeReceipt("aGVsbG8=", "image/jpeg");

    expect(result.itemsMatchTotal).toBe(false);
  });

  it("still returns the imagePath when extraction fails (fallback manual con foto)", async () => {
    mockExtract.mockResolvedValueOnce(null);
    mockUpload.mockResolvedValueOnce({ data: { path: "x" }, error: null });

    const { analyzeReceipt } = await import("@/receipts/actions");
    const result = await analyzeReceipt("aGVsbG8=", "image/jpeg");

    expect(result.receipt).toBeUndefined();
    expect(result.error).toMatch(/no pudimos leer/i);
    expect(result.imagePath).toMatch(new RegExp(`^${UUID_HOUSEHOLD}/`));
  });

  it("returns the receipt without imagePath when the upload fails", async () => {
    mockExtract.mockResolvedValueOnce(EXTRACTION);
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: "bucket missing" } });

    const { analyzeReceipt } = await import("@/receipts/actions");
    const result = await analyzeReceipt("aGVsbG8=", "image/jpeg");

    expect(result.receipt).toEqual(EXTRACTION);
    expect(result.imagePath).toBeUndefined();
  });

  it("rejects payloads over the size guard", async () => {
    const { analyzeReceipt } = await import("@/receipts/actions");
    const big = "x".repeat(3_000_001);
    const result = await analyzeReceipt(big, "image/jpeg");
    expect(result.error).toMatch(/grande/i);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("rejects unsupported mime types", async () => {
    const { analyzeReceipt } = await import("@/receipts/actions");
    const result = await analyzeReceipt("aGVsbG8=", "application/pdf");
    expect(result.error).toMatch(/imagen/i);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("returns error when user has no household", async () => {
    const { getUserHousehold } = await import("@/household/queries");
    (getUserHousehold as jest.Mock).mockResolvedValueOnce(null);

    const { analyzeReceipt } = await import("@/receipts/actions");
    const result = await analyzeReceipt("aGVsbG8=", "image/jpeg");
    expect(result.error).toBeDefined();
  });
});
