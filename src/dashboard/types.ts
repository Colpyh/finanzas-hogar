export type DashboardSummary = {
  fixedTotal: number;
  installmentsTotal: number;
  oneTimeTotal: number;
  grandTotal: number;
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
