/**
 * Pure functions for installment calculations.
 * Used by both the form (live preview) and tests.
 */

type PreviewInput = {
  installmentsTotal: number;
  installmentAmount: number;
};

type PreviewResult = {
  total: number;
  preview: string;
};

export function calculateInstallmentPreview({
  installmentsTotal,
  installmentAmount,
}: PreviewInput): PreviewResult {
  const total = installmentsTotal * installmentAmount;
  const preview = `${installmentsTotal} × $${installmentAmount.toFixed(2)} = $${total.toFixed(2)}`;
  return { total, preview };
}

/**
 * Returns true if another installment payment can be recorded.
 * Covers Scenario 3.6 — server-side guard.
 */
export function canMarkInstallmentPaid(
  installmentsPaid: number,
  installmentsTotal: number
): boolean {
  return installmentsPaid < installmentsTotal;
}
