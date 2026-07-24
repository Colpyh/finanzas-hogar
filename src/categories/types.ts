export type CategoryBudgetStatus = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  monthlyBudget: number;
  spent: number;
  percentage: number; // 0–100+
};
