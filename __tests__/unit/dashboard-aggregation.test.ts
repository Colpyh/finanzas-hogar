import { calcPercentage, aggregateTotals } from "@/dashboard/aggregation";

// ============================================================
// calcPercentage — used in fixed vs variable breakdown (Scenario 5.2)
// ============================================================
describe("calcPercentage", () => {
  it("returns 50 when value is half of total", () => {
    expect(calcPercentage(500, 1000)).toBe(50);
  });

  it("returns 100 when value equals total", () => {
    expect(calcPercentage(1000, 1000)).toBe(100);
  });

  it("returns 0 when value is 0", () => {
    expect(calcPercentage(0, 1000)).toBe(0);
  });

  it("returns 0 when total is 0 (avoids division by zero)", () => {
    expect(calcPercentage(100, 0)).toBe(0);
  });

  it("rounds to 1 decimal place", () => {
    expect(calcPercentage(1, 3)).toBe(33.3);
  });
});

// ============================================================
// aggregateTotals — Scenario 4.1
// ============================================================
describe("aggregateTotals", () => {
  it("sums all three categories and returns grand total", () => {
    const result = aggregateTotals({
      fixedTotal: 10000,
      installmentsTotal: 5000,
      oneTimeTotal: 3000,
      incomeTotal: 0,
    });
    expect(result.grandTotal).toBe(18000);
    expect(result.fixedTotal).toBe(10000);
    expect(result.installmentsTotal).toBe(5000);
    expect(result.oneTimeTotal).toBe(3000);
  });

  it("handles all zeros", () => {
    const result = aggregateTotals({ fixedTotal: 0, installmentsTotal: 0, oneTimeTotal: 0, incomeTotal: 0 });
    expect(result.grandTotal).toBe(0);
  });

  it("handles only one-time purchases (no fixed or installments)", () => {
    const result = aggregateTotals({ fixedTotal: 0, installmentsTotal: 0, oneTimeTotal: 7500, incomeTotal: 0 });
    expect(result.grandTotal).toBe(7500);
  });
});
