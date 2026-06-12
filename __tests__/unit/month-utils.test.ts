import { getPrevMonth, getNextMonth, formatMonthLabel, monthToDate, elapsedMonths } from "@/resumen/month-utils";

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

// ============================================================
// elapsedMonths — months between two month strings
// ============================================================
describe("elapsedMonths", () => {
  it("returns 0 for same month (YYYY-MM format)", () => {
    expect(elapsedMonths("2026-04", "2026-04")).toBe(0);
  });

  it("returns 0 for same month (YYYY-MM-DD format)", () => {
    expect(elapsedMonths("2026-04-01", "2026-04-01")).toBe(0);
  });

  it("returns 1 for consecutive months", () => {
    expect(elapsedMonths("2026-03", "2026-04")).toBe(1);
  });

  it("crosses year boundary correctly", () => {
    expect(elapsedMonths("2025-11", "2026-02")).toBe(3);
  });

  it("handles full year gap", () => {
    expect(elapsedMonths("2025-01", "2026-01")).toBe(12);
  });

  it("handles installment started before 12-month window — the original bug", () => {
    // Installment started Jan 2024, window starts Jul 2024 (6 months later).
    // For the first month of the window, elapsed should be 6, not 12.
    expect(elapsedMonths("2024-01-01", "2024-07-01")).toBe(6);
  });

  it("returns negative when target is before start", () => {
    expect(elapsedMonths("2026-04", "2026-01")).toBe(-3);
  });

  it("accepts mixed formats (YYYY-MM-DD and YYYY-MM)", () => {
    expect(elapsedMonths("2024-01-01", "2026-06")).toBe(29);
  });
});
