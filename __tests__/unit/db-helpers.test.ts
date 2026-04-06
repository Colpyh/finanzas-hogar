import { currentPeriodMonth, paginationHelper } from "@/shared/lib/db/helpers";

// ============================================================
// currentPeriodMonth()
// Returns the first day of the current month as 'YYYY-MM-01'
// ============================================================
describe("currentPeriodMonth", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the first day of the current month in YYYY-MM-01 format", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-15T12:00:00Z").getTime());

    expect(currentPeriodMonth()).toBe("2026-04-01");
  });

  it("returns correct value for a different month", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-12-31T23:59:59Z").getTime());

    expect(currentPeriodMonth()).toBe("2026-12-01");
  });

  it("pads single-digit months with a leading zero", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime());

    expect(currentPeriodMonth()).toBe("2026-01-01");
  });
});

// ============================================================
// paginationHelper()
// Returns { limit, offset } for SQL pagination
// ============================================================
describe("paginationHelper", () => {
  it("returns correct limit and offset for first page", () => {
    const result = paginationHelper(1, 10);
    expect(result).toEqual({ limit: 10, offset: 0 });
  });

  it("returns correct offset for page 3 with pageSize 10", () => {
    const result = paginationHelper(3, 10);
    expect(result).toEqual({ limit: 10, offset: 20 });
  });

  it("works with a different page size", () => {
    const result = paginationHelper(2, 25);
    expect(result).toEqual({ limit: 25, offset: 25 });
  });
});
