import { createPurchaseSchema, createInstallmentSchema } from "@/compras/types";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================
// createPurchaseSchema — Scenario 3.1
// ============================================================
describe("createPurchaseSchema", () => {
  const valid = {
    description: "Supermercado",
    categoryId: UUID,
    amount: "3500.00",
    currency: "ARS",
    expenseDate: "2026-04-06",
  };

  it("accepts a valid one-time purchase", () => {
    expect(createPurchaseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty description", () => {
    const r = createPurchaseSchema.safeParse({ ...valid, description: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const r = createPurchaseSchema.safeParse({ ...valid, expenseDate: "not-a-date" });
    expect(r.success).toBe(false);
  });

  it("rejects empty amount", () => {
    const r = createPurchaseSchema.safeParse({ ...valid, amount: "" });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// createInstallmentSchema — Scenarios 3.2, 3.3, 3.4
// ============================================================
describe("createInstallmentSchema", () => {
  const valid = {
    description: "Heladera",
    categoryId: UUID,
    currency: "ARS",
    installmentsTotal: 12,
    installmentAmount: "5000.00",
    startMonth: "2026-04-01",
  };

  it("accepts valid installment input and transforms amount", () => {
    const r = createInstallmentSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.amount).toBe("60000.00");
  });

  it("rejects installmentsTotal = 1 (Scenario 3.4)", () => {
    const r = createInstallmentSchema.safeParse({ ...valid, installmentsTotal: 1 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("2 cuotas");
  });

  it("rejects installmentsTotal = 0 (Scenario 3.4)", () => {
    const r = createInstallmentSchema.safeParse({ ...valid, installmentsTotal: 0 });
    expect(r.success).toBe(false);
  });

  it("accepts installmentsTotal = 2 (boundary)", () => {
    const r = createInstallmentSchema.safeParse({ ...valid, installmentsTotal: 2 });
    expect(r.success).toBe(true);
  });

  it("computes amount = installmentAmount * installmentsTotal", () => {
    const r = createInstallmentSchema.safeParse({ ...valid, installmentsTotal: 3, installmentAmount: "1000.00" });
    expect(r.success).toBe(true);
    expect(r.data?.amount).toBe("3000.00");
  });
});
