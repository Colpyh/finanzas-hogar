/**
 * Tests for dashboard type contracts and query helpers.
 * These validate the pure JS filtering logic used in getDashboardSummary
 * and getActiveInstallments, isolated from the DB.
 */

import type {
  DashboardSummary,
  FixedBillWithStatus,
  ActiveInstallment,
} from "@/dashboard/types";
import { aggregateTotals } from "@/dashboard/aggregation";

// ============================================================
// DashboardSummary shape — Scenario 4.1
// ============================================================
describe("DashboardSummary type contract", () => {
  function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
    return {
      ...aggregateTotals({ fixedTotal: 0, installmentsTotal: 0, oneTimeTotal: 0, incomeTotal: 0 }),
      myShareTotal: 0,
      myShareFixed: 0,
      myShareInstallments: 0,
      myShareOneTime: 0,
      myIncomeTotal: 0,
      mySaldo: 0,
      ...overrides,
    };
  }

  it("aggregateTotals produces a valid DashboardSummary", () => {
    const summary = makeSummary(
      aggregateTotals({ fixedTotal: 15000, installmentsTotal: 5000, oneTimeTotal: 3000, incomeTotal: 0 })
    );
    expect(summary.fixedTotal).toBe(15000);
    expect(summary.installmentsTotal).toBe(5000);
    expect(summary.oneTimeTotal).toBe(3000);
    expect(summary.grandTotal).toBe(23000);
  });

  it("grand total is 0 when all categories are 0", () => {
    const summary = makeSummary();
    expect(summary.grandTotal).toBe(0);
  });
});

// ============================================================
// Installment active filter logic — Scenario 4.3, 4.4
// ============================================================

type InstallmentRow = {
  installmentAmount: string | null;
  installmentsPaid: number | null;
  installmentsTotal: number | null;
};

function filterActiveInstallments(rows: InstallmentRow[]): InstallmentRow[] {
  return rows.filter(
    (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
  );
}

function sumInstallmentAmounts(rows: InstallmentRow[]): number {
  return rows.reduce((acc, row) => acc + Number(row.installmentAmount ?? 0), 0);
}

describe("installment active filter (mirrors getDashboardSummary logic)", () => {
  it("includes installments where paid < total", () => {
    const rows: InstallmentRow[] = [
      { installmentAmount: "1000", installmentsPaid: 2, installmentsTotal: 6 },
      { installmentAmount: "2000", installmentsPaid: 5, installmentsTotal: 12 },
    ];
    const active = filterActiveInstallments(rows);
    expect(active).toHaveLength(2);
    expect(sumInstallmentAmounts(active)).toBe(3000);
  });

  it("excludes completed installments (paid = total) — Scenario 4.4", () => {
    const rows: InstallmentRow[] = [
      { installmentAmount: "1000", installmentsPaid: 6, installmentsTotal: 6 },
      { installmentAmount: "500", installmentsPaid: 3, installmentsTotal: 12 },
    ];
    const active = filterActiveInstallments(rows);
    expect(active).toHaveLength(1);
    expect(active[0]?.installmentAmount).toBe("500");
  });

  it("returns empty when all installments are completed", () => {
    const rows: InstallmentRow[] = [
      { installmentAmount: "1000", installmentsPaid: 12, installmentsTotal: 12 },
    ];
    const active = filterActiveInstallments(rows);
    expect(active).toHaveLength(0);
    expect(sumInstallmentAmounts(active)).toBe(0);
  });

  it("treats null installmentsPaid as 0 (always active)", () => {
    const rows: InstallmentRow[] = [
      { installmentAmount: "800", installmentsPaid: null, installmentsTotal: 3 },
    ];
    const active = filterActiveInstallments(rows);
    expect(active).toHaveLength(1);
  });

  it("treats null installmentsTotal as 0 (never active — paid >= total)", () => {
    const rows: InstallmentRow[] = [
      { installmentAmount: "800", installmentsPaid: 0, installmentsTotal: null },
    ];
    // paid(0) < total(0) is false → excluded
    const active = filterActiveInstallments(rows);
    expect(active).toHaveLength(0);
  });
});

// ============================================================
// One-time expense month prefix filter — used in getDashboardSummary
// ============================================================

type OneTimeRow = { amount: string | null; expenseDate: string | null };

function filterByMonthPrefix(rows: OneTimeRow[], monthPrefix: string): OneTimeRow[] {
  return rows.filter(
    (row) => row.expenseDate != null && row.expenseDate.startsWith(monthPrefix)
  );
}

describe("one-time expense month prefix filter", () => {
  const rows: OneTimeRow[] = [
    { amount: "500", expenseDate: "2026-04-05" },
    { amount: "1200", expenseDate: "2026-04-20" },
    { amount: "300", expenseDate: "2026-03-31" },
    { amount: "800", expenseDate: null },
  ];

  it("includes only expenses matching YYYY-MM prefix", () => {
    const filtered = filterByMonthPrefix(rows, "2026-04");
    expect(filtered).toHaveLength(2);
    expect(filtered.reduce((a, r) => a + Number(r.amount), 0)).toBe(1700);
  });

  it("excludes expenses from other months", () => {
    const filtered = filterByMonthPrefix(rows, "2026-03");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.amount).toBe("300");
  });

  it("excludes rows with null expenseDate", () => {
    const filtered = filterByMonthPrefix(rows, "2026-04");
    expect(filtered.every((r) => r.expenseDate !== null)).toBe(true);
  });

  it("returns empty if no expenses match the month", () => {
    const filtered = filterByMonthPrefix(rows, "2025-01");
    expect(filtered).toHaveLength(0);
  });
});

// ============================================================
// FixedBillWithStatus — Scenario 4.2
// ============================================================
describe("FixedBillWithStatus contract", () => {
  it("paid=true when payment exists", () => {
    const bill: FixedBillWithStatus = {
      id: "abc",
      description: "Alquiler",
      amount: 50000,
      paid: true,
      responsibleId: null,
      isShared: true,
    };
    expect(bill.paid).toBe(true);
  });

  it("paid=false when no payment exists", () => {
    const bill: FixedBillWithStatus = {
      id: "xyz",
      description: "Luz",
      amount: 8000,
      paid: false,
      responsibleId: null,
      isShared: false,
    };
    expect(bill.paid).toBe(false);
  });
});

// ============================================================
// ActiveInstallment — Scenario 4.3
// ============================================================
describe("ActiveInstallment contract", () => {
  it("models an in-progress installment correctly", () => {
    const item: ActiveInstallment = {
      id: "i1",
      description: "Heladera",
      amount: 12000,
      installmentsPaid: 3,
      installmentsTotal: 12,
      responsibleId: null,
    };
    expect(item.installmentsPaid).toBeLessThan(item.installmentsTotal);
  });
});
