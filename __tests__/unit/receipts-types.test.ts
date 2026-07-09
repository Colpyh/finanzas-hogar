import {
  extractedReceiptSchema,
  itemsMatchTotal,
  receiptItemSchema,
} from "@/receipts/types";

describe("receiptItemSchema", () => {
  it("accepts a full item", () => {
    const r = receiptItemSchema.safeParse({ description: "Pan de molde", quantity: 2, total: 4380 });
    expect(r.success).toBe(true);
  });

  it("accepts null quantity (boletas sin cantidad por línea)", () => {
    const r = receiptItemSchema.safeParse({ description: "Bolsa", quantity: null, total: 100 });
    expect(r.success).toBe(true);
  });

  it("accepts negative totals (descuentos en la boleta)", () => {
    const r = receiptItemSchema.safeParse({ description: "DESC. CLUB", quantity: null, total: -500 });
    expect(r.success).toBe(true);
  });

  it("rejects empty description", () => {
    const r = receiptItemSchema.safeParse({ description: "", quantity: 1, total: 100 });
    expect(r.success).toBe(false);
  });
});

describe("extractedReceiptSchema", () => {
  const valid = {
    merchant: "LIDER EXPRESS",
    total: 15990,
    date: "2026-07-09",
    items: [{ description: "Leche entera 1L", quantity: 2, total: 2380 }],
  };

  it("accepts a valid extraction", () => {
    expect(extractedReceiptSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts empty items (F1: solo total)", () => {
    expect(extractedReceiptSchema.safeParse({ ...valid, items: [] }).success).toBe(true);
  });

  it("rejects non-positive total", () => {
    expect(extractedReceiptSchema.safeParse({ ...valid, total: 0 }).success).toBe(false);
  });

  it("rejects malformed date", () => {
    expect(extractedReceiptSchema.safeParse({ ...valid, date: "09/07/2026" }).success).toBe(false);
  });
});

describe("itemsMatchTotal", () => {
  it("true when items sum equals the printed total", () => {
    const items = [
      { description: "A", quantity: null, total: 1000 },
      { description: "B", quantity: null, total: 2500 },
    ];
    expect(itemsMatchTotal(items, 3500)).toBe(true);
  });

  it("true with discounts (negative lines) that net to the total", () => {
    const items = [
      { description: "A", quantity: null, total: 4000 },
      { description: "DESC.", quantity: null, total: -500 },
    ];
    expect(itemsMatchTotal(items, 3500)).toBe(true);
  });

  it("false when the sum differs (extracción parcial)", () => {
    const items = [{ description: "A", quantity: null, total: 1000 }];
    expect(itemsMatchTotal(items, 3500)).toBe(false);
  });

  it("true when there are no items — nothing to contradict", () => {
    expect(itemsMatchTotal([], 3500)).toBe(true);
  });
});
