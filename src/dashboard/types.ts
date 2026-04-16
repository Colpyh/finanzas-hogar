export type DashboardSummary = {
  fixedTotal: number;
  installmentsTotal: number;
  oneTimeTotal: number;
  grandTotal: number;
  incomeTotal: number;
  saldo: number;
  porcentajeUsado: number; // 0–100
  myShareTotal: number; // estimated share for the current user (50/50 for unassigned)
};

export type FixedBillWithStatus = {
  id: string;
  description: string;
  amount: number;
  paid: boolean;
};

export type ActiveInstallment = {
  id: string;
  description: string;
  amount: number;
  installmentsPaid: number;
  installmentsTotal: number;
};
