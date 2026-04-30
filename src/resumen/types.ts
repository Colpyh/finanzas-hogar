export type MonthlySummary = {
  fixedTotal: number;
  installmentsTotal: number;
  oneTimeTotal: number;
  grandTotal: number;
  byCategory: { categoryId: string; categoryName: string; total: number; budget: number | null }[];
};

export type FixedVsVariableBreakdown = {
  fixedAmount: number;
  fixedPct: number;
  variableAmount: number;
  variablePct: number;
  installmentsAmount: number;
  installmentsPct: number;
};

export type InstallmentBurden = {
  monthlyLockIn: number;
  installments: {
    id: string;
    description: string;
    amount: number;
    remaining: number;
  }[];
};
