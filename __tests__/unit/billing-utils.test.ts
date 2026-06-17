import { effectiveBillingMonth, billingPeriodForMonth } from "@/shared/lib/billing";

// ============================================================
// effectiveBillingMonth
// ============================================================
describe("effectiveBillingMonth", () => {
  describe("purchase on or before closing day → same month", () => {
    it("purchase on closing day", () => {
      expect(effectiveBillingMonth("2026-06-25", 25)).toBe("2026-06");
    });

    it("purchase before closing day", () => {
      expect(effectiveBillingMonth("2026-06-24", 25)).toBe("2026-06");
    });

    it("purchase on day 1", () => {
      expect(effectiveBillingMonth("2026-06-01", 25)).toBe("2026-06");
    });
  });

  describe("purchase after closing day → next month", () => {
    it("purchase the day after closing", () => {
      expect(effectiveBillingMonth("2026-06-26", 25)).toBe("2026-07");
    });

    it("purchase on last day of month", () => {
      expect(effectiveBillingMonth("2026-06-30", 25)).toBe("2026-07");
    });

    it("crosses year boundary: December purchase after closing → January", () => {
      expect(effectiveBillingMonth("2026-12-26", 25)).toBe("2027-01");
    });
  });

  describe("edge: closing day 1 (almost everything shifts)", () => {
    it("purchase on day 1 stays", () => {
      expect(effectiveBillingMonth("2026-06-01", 1)).toBe("2026-06");
    });

    it("purchase on day 2 shifts to next month", () => {
      expect(effectiveBillingMonth("2026-06-02", 1)).toBe("2026-07");
    });
  });
});

// ============================================================
// billingPeriodForMonth
// ============================================================
describe("billingPeriodForMonth", () => {
  it("standard case: July with closingDay=25", () => {
    const { start, end } = billingPeriodForMonth("2026-07-01", 25);
    expect(start).toBe("2026-05-26");
    expect(end).toBe("2026-06-25");
  });

  it("January: payment covers Nov 26–Dec 25 (previous year)", () => {
    // Due Jan → billing closed Dec 25 → period: Nov 26 to Dec 25
    const { start, end } = billingPeriodForMonth("2026-01-01", 25);
    expect(start).toBe("2025-11-26");
    expect(end).toBe("2025-12-25");
  });

  it("February: payment covers Dec 26–Jan 25", () => {
    // Due Feb → billing closed Jan 25 → period: Dec 26 to Jan 25
    const { start, end } = billingPeriodForMonth("2026-02-01", 25);
    expect(start).toBe("2025-12-26");
    expect(end).toBe("2026-01-25");
  });

  it("closingDay=1 produces tight billing period", () => {
    const { start, end } = billingPeriodForMonth("2026-07-01", 1);
    expect(start).toBe("2026-05-02");
    expect(end).toBe("2026-06-01");
  });

  it("closingDay capped at last day when end month is shorter (April=30 days, closingDay=31)", () => {
    // Payment due in June, billing end month = May (31 days) → closingDay=31 fits
    const { start, end } = billingPeriodForMonth("2026-06-01", 31);
    expect(end).toBe("2026-05-31");
  });

  it("closingDay=28 on February end month (Feb 2026 = 28 days)", () => {
    // Payment due in April, billing end month = March (31 days)
    const { start, end } = billingPeriodForMonth("2026-04-01", 28);
    expect(end).toBe("2026-03-28");
  });

  it("start date overflows correctly when closingDay is near month end", () => {
    // closingDay=30, targetMonth=2026-05 (May)
    // endMonth=April (30 days), startMonth=March
    // start = March 31, end = April 30
    const { start, end } = billingPeriodForMonth("2026-05-01", 30);
    expect(start).toBe("2026-03-31");
    expect(end).toBe("2026-04-30");
  });
});
