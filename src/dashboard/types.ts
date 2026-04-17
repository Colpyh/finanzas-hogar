export type DashboardSummary = {
  fixedTotal: number;
  installmentsTotal: number;
  oneTimeTotal: number;
  grandTotal: number;
  incomeTotal: number;
  saldo: number;
  porcentajeUsado: number; // 0–100
  myShareTotal: number;
  myShareFixed: number;
  myShareInstallments: number;
  myShareOneTime: number;
  myIncomeTotal: number;
  mySaldo: number;
};

export type FixedBillWithStatus = {
  id: string;
  description: string;
  amount: number;
  paid: boolean;
  responsibleId: string | null;
  isShared: boolean;
};

export type ActiveInstallment = {
  id: string;
  description: string;
  amount: number;
  installmentsPaid: number;
  installmentsTotal: number;
  responsibleId: string | null;
};

export type RecentPurchase = {
  id: string;
  description: string;
  amount: number;
  expenseDate: string | null;
  responsibleId: string | null;
};
