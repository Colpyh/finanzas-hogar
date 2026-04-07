import { getPrevMonth, getNextMonth, formatMonthLabel, monthToDate } from "@/resumen/month-utils";

// ============================================================
// getPrevMonth — Scenario 5.4
// ============================================================
describe("getPrevMonth", () => {
  it("returns previous month for mid-year", () => {
    expect(getPrevMonth("2026-04")).toBe("2026-03");
  });

  it("wraps from January to December of previous year", () => {
    expect(getPrevMonth("2026-01")).toBe("2025-12");
  });

  it("handles December → November", () => {
    expect(getPrevMonth("2026-12")).toBe("2026-11");
  });
});

// ============================================================
// getNextMonth — Scenario 5.4
// ============================================================
describe("getNextMonth", () => {
  it("returns next month for mid-year", () => {
    expect(getNextMonth("2026-04")).toBe("2026-05");
  });

  it("wraps from December to January of next year", () => {
    expect(getNextMonth("2026-12")).toBe("2027-01");
  });

  it("handles January → February", () => {
    expect(getNextMonth("2026-01")).toBe("2026-02");
  });
});

// ============================================================
// formatMonthLabel
// ============================================================
describe("formatMonthLabel", () => {
  it("formats month in Spanish locale", () => {
    const label = formatMonthLabel("2026-04");
    expect(label.toLowerCase()).toContain("abril");
    expect(label).toContain("2026");
  });

  it("formats a different month", () => {
    const label = formatMonthLabel("2026-12");
    expect(label.toLowerCase()).toContain("diciembre");
  });
});

// ============================================================
// monthToDate — converts 'YYYY-MM' to 'YYYY-MM-01'
// ============================================================
describe("monthToDate", () => {
  it("appends -01 to month string", () => {
    expect(monthToDate("2026-04")).toBe("2026-04-01");
  });

  it("works for December", () => {
    expect(monthToDate("2026-12")).toBe("2026-12-01");
  });
});
