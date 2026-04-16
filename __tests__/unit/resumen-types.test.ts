/**
 * Tests for resumen type contracts and query helper logic.
 * Tests the pure JS computation used in getMonthlySummary,
 * getFixedVsVariableBreakdown, and getInstallmentBurden.
 */

import type {
  MonthlySummary,
  FixedVsVariableBreakdown,
  InstallmentBurden,
} from "@/resumen/types";
import { calcPercentage, aggregateTotals } from "@/dashboard/aggregation";

// ============================================================
// MonthlySummary — Scenario 5.1
// ============================================================
describe("MonthlySummary contract", () => {
  it("grandTotal includes all categories", () => {
    const summary: MonthlySummary = {
      ...aggregateTotals({ fixedTotal: 20000, installmentsTotal: 8000, oneTimeTotal: 5000, incomeTotal: 0 }),
      byCategory: [
        { categoryId: "c1", categoryName: "Alimentación", total: 5000 },
        { categoryId: "c2", categoryName: "Servicios", total: 3000 },
      ],
    };
    expect(summary.grandTotal).toBe(33000);
    expect(summary.byCategory).toHaveLength(2);
  });

  it("byCategory can be empty when no variable expenses exist", () => {
    const summary: MonthlySummary = {
      ...aggregateTotals({ fixedTotal: 10000, installmentsTotal: 0, oneTimeTotal: 0, incomeTotal: 0 }),
      byCategory: [],
    };
    expect(summary.byCategory).toHaveLength(0);
    expect(summary.grandTotal).toBe(10000);
  });
});

// ============================================================
// byCategory sort (mirrors getMonthlySummary logic)
// ============================================================

type CategoryAccum = { categoryId: string; categoryName: string; total: number };

function sortCategoriesDesc(categories: CategoryAccum[]): CategoryAccum[] {
  return [...categories].sort((a, b) => b.total - a.total);
}

describe("byCategory sort logic — Scenario 5.1", () => {
  it("sorts categories descending by total", () => {
    const input: CategoryAccum[] = [
      { categoryId: "c1", categoryName: "Servicios", total: 3000 },
      { categoryId: "c2", categoryName: "Alimentación", total: 8000 },
      { categoryId: "c3", categoryName: "Transporte", total: 1500 },
    ];
    const sorted = sortCategoriesDesc(input);
    expect(sorted[0]?.total).toBe(8000);
    expect(sorted[1]?.total).toBe(3000);
    expect(sorted[2]?.total).toBe(1500);
  });

  it("single category is returned as-is", () => {
    const input: CategoryAccum[] = [
      { categoryId: "c1", categoryName: "Otros", total: 500 },
    ];
    const sorted = sortCategoriesDesc(input);
    expect(sorted).toHaveLength(1);
  });
});

// ============================================================
// FixedVsVariableBreakdown percentages — Scenario 5.2
// ============================================================
describe("FixedVsVariableBreakdown contract", () => {
  function buildBreakdown(
    fixedAmount: number,
    installmentsAmount: number,
    oneTimeTotal: number
  ): FixedVsVariableBreakdown {
    const variableAmount = oneTimeTotal + installmentsAmount;
    const grandTotal = fixedAmount + variableAmount;
    return {
      fixedAmount,
      fixedPct: calcPercentage(fixedAmount, grandTotal),
      variableAmount,
      variablePct: calcPercentage(variableAmount, grandTotal),
      installmentsAmount,
      installmentsPct: calcPercentage(installmentsAmount, grandTotal),
    };
  }

  it("percentages sum correctly (may differ slightly due to rounding)", () => {
    const bd = buildBreakdown(10000, 5000, 5000);
    expect(bd.fixedAmount).toBe(10000);
    expect(bd.fixedPct).toBe(50);
    expect(bd.variableAmount).toBe(10000);
    expect(bd.variablePct).toBe(50);
  });

  it("100% fixed when no variable expenses exist", () => {
    const bd = buildBreakdown(20000, 0, 0);
    expect(bd.fixedPct).toBe(100);
    expect(bd.variablePct).toBe(0);
    expect(bd.installmentsPct).toBe(0);
  });

  it("0% all when total is 0 (no expenses)", () => {
    const bd = buildBreakdown(0, 0, 0);
    expect(bd.fixedPct).toBe(0);
    expect(bd.variablePct).toBe(0);
    expect(bd.installmentsPct).toBe(0);
  });

  it("installments included in variable amount — Scenario 5.2", () => {
    const bd = buildBreakdown(5000, 3000, 2000);
    expect(bd.variableAmount).toBe(5000); // oneTime + installments
    expect(bd.installmentsAmount).toBe(3000);
  });
});

// ============================================================
// InstallmentBurden — Scenario 5.3
// ============================================================

type BurdenRow = {
  id: string;
  description: string;
  installmentAmount: string | null;
  installmentsPaid: number | null;
  installmentsTotal: number | null;
};

function computeInstallmentBurden(rows: BurdenRow[]): InstallmentBurden {
  const active = rows.filter(
    (row) => (row.installmentsPaid ?? 0) < (row.installmentsTotal ?? 0)
  );

  const monthlyLockIn = active.reduce(
    (acc, row) => acc + Number(row.installmentAmount ?? 0),
    0
  );

  return {
    monthlyLockIn,
    installments: active.map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.installmentAmount ?? 0),
      remaining: (row.installmentsTotal ?? 0) - (row.installmentsPaid ?? 0),
    })),
  };
}

describe("getInstallmentBurden computation", () => {
  it("computes monthlyLockIn correctly", () => {
    const rows: BurdenRow[] = [
      { id: "1", description: "TV", installmentAmount: "3000", installmentsPaid: 2, installmentsTotal: 12 },
      { id: "2", description: "Silla", installmentAmount: "1500", installmentsPaid: 1, installmentsTotal: 6 },
    ];
    const burden = computeInstallmentBurden(rows);
    expect(burden.monthlyLockIn).toBe(4500);
    expect(burden.installments).toHaveLength(2);
  });

  it("remaining = installmentsTotal - installmentsPaid", () => {
    const rows: BurdenRow[] = [
      { id: "1", description: "Notebook", installmentAmount: "5000", installmentsPaid: 4, installmentsTotal: 12 },
    ];
    const burden = computeInstallmentBurden(rows);
    expect(burden.installments[0]?.remaining).toBe(8);
  });

  it("excludes completed installments from burden", () => {
    const rows: BurdenRow[] = [
      { id: "1", description: "Done", installmentAmount: "2000", installmentsPaid: 6, installmentsTotal: 6 },
      { id: "2", description: "Active", installmentAmount: "1000", installmentsPaid: 3, installmentsTotal: 6 },
    ];
    const burden = computeInstallmentBurden(rows);
    expect(burden.monthlyLockIn).toBe(1000);
    expect(burden.installments).toHaveLength(1);
    expect(burden.installments[0]?.description).toBe("Active");
  });

  it("returns empty burden when no active installments", () => {
    const rows: BurdenRow[] = [
      { id: "1", description: "Done", installmentAmount: "2000", installmentsPaid: 12, installmentsTotal: 12 },
    ];
    const burden = computeInstallmentBurden(rows);
    expect(burden.monthlyLockIn).toBe(0);
    expect(burden.installments).toHaveLength(0);
  });
});
