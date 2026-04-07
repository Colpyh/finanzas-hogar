/**
 * Pure aggregation functions for dashboard calculations.
 */

export interface TotalsInput {
  fixedTotal: number;
  installmentsTotal: number;
  oneTimeTotal: number;
}

export interface TotalsResult extends TotalsInput {
  grandTotal: number;
}

export function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export function aggregateTotals(input: TotalsInput): TotalsResult {
  return {
    ...input,
    grandTotal: input.fixedTotal + input.installmentsTotal + input.oneTimeTotal,
  };
}
