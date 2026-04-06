import {
  calculateInstallmentPreview,
  canMarkInstallmentPaid,
} from "@/compras/installment-utils";

// ============================================================
// calculateInstallmentPreview — Scenarios 3.2, 3.3, 3.7
// ============================================================
describe("calculateInstallmentPreview", () => {
  it("computes total and preview from per-installment amount (Scenario 3.3)", () => {
    const result = calculateInstallmentPreview({ installmentsTotal: 12, installmentAmount: 1000 });
    expect(result.total).toBe(12000);
    expect(result.preview).toBe("12 × $1000.00 = $12000.00");
  });

  it("computes installmentAmount from total (Scenario 3.2)", () => {
    const result = calculateInstallmentPreview({ installmentsTotal: 3, installmentAmount: 500 });
    expect(result.total).toBe(1500);
    expect(result.preview).toBe("3 × $500.00 = $1500.00");
  });

  it("handles decimal installment amounts", () => {
    const result = calculateInstallmentPreview({ installmentsTotal: 3, installmentAmount: 333.33 });
    expect(result.total).toBeCloseTo(999.99, 1);
    expect(result.preview).toContain("3 ×");
  });

  it("returns zero total for zero amount", () => {
    const result = calculateInstallmentPreview({ installmentsTotal: 6, installmentAmount: 0 });
    expect(result.total).toBe(0);
  });
});

// ============================================================
// canMarkInstallmentPaid — Scenario 3.6
// ============================================================
describe("canMarkInstallmentPaid", () => {
  it("returns true when installments_paid < installments_total", () => {
    expect(canMarkInstallmentPaid(3, 12)).toBe(true);
  });

  it("returns false when installments_paid === installments_total (fully paid)", () => {
    expect(canMarkInstallmentPaid(12, 12)).toBe(false);
  });

  it("returns false when installments_paid > installments_total (defensive)", () => {
    expect(canMarkInstallmentPaid(13, 12)).toBe(false);
  });

  it("returns true for first installment (0 paid)", () => {
    expect(canMarkInstallmentPaid(0, 6)).toBe(true);
  });
});
