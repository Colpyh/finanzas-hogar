import {
  createFixedExpenseSchema,
  markPaidSchema,
  updateFixedExpenseSchema,
} from "@/gastos-fijos/types";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================
// createFixedExpenseSchema — Scenarios 2.1, 2.2, 2.3
// ============================================================
describe("createFixedExpenseSchema", () => {
  const valid = {
    description: "Alquiler",
    categoryId: VALID_UUID,
    amount: "50000.00",
    currency: "ARS",
    recurrenceDay: 10,
  };

  it("accepts a valid fixed expense", () => {
    expect(createFixedExpenseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty description (Scenario 2.2)", () => {
    const result = createFixedExpenseSchema.safeParse({ ...valid, description: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("description");
  });

  it("rejects missing amount (Scenario 2.2)", () => {
    const result = createFixedExpenseSchema.safeParse({ ...valid, amount: "" });
    expect(result.success).toBe(false);
  });

  it("rejects recurrenceDay = 0 (Scenario 2.3)", () => {
    const result = createFixedExpenseSchema.safeParse({ ...valid, recurrenceDay: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("recurrenceDay");
  });

  it("rejects recurrenceDay = 32 (Scenario 2.3)", () => {
    const result = createFixedExpenseSchema.safeParse({ ...valid, recurrenceDay: 32 });
    expect(result.success).toBe(false);
  });

  it("accepts recurrenceDay = 1 (boundary)", () => {
    expect(createFixedExpenseSchema.safeParse({ ...valid, recurrenceDay: 1 }).success).toBe(true);
  });

  it("accepts recurrenceDay = 31 (boundary)", () => {
    expect(createFixedExpenseSchema.safeParse({ ...valid, recurrenceDay: 31 }).success).toBe(true);
  });
});

// ============================================================
// markPaidSchema — Scenarios 2.5, 2.7
// ============================================================
describe("markPaidSchema", () => {
  it("accepts valid mark-paid input with actual amount", () => {
    const result = markPaidSchema.safeParse({
      expenseId: VALID_UUID,
      amount: "5200.00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional notes field", () => {
    const result = markPaidSchema.safeParse({
      expenseId: VALID_UUID,
      amount: "5200.00",
      notes: "Pago con tarjeta",
    });
    expect(result.success).toBe(true);
    expect(result.data?.notes).toBe("Pago con tarjeta");
  });

  it("rejects missing expenseId", () => {
    const result = markPaidSchema.safeParse({ amount: "5200.00" });
    expect(result.success).toBe(false);
  });

  it("rejects empty amount", () => {
    const result = markPaidSchema.safeParse({ expenseId: VALID_UUID, amount: "" });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// updateFixedExpenseSchema
// ============================================================
describe("updateFixedExpenseSchema", () => {
  it("accepts partial update with just description", () => {
    const result = updateFixedExpenseSchema.safeParse({ description: "Nuevo nombre" });
    expect(result.success).toBe(true);
  });

  it("rejects recurrenceDay outside 1–31 in update", () => {
    const result = updateFixedExpenseSchema.safeParse({ recurrenceDay: 0 });
    expect(result.success).toBe(false);
  });
});
