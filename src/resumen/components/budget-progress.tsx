import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  categoryName: string;
  spent: number;
  budget: number;
  currency?: string;
};

export function BudgetProgress({ categoryName, spent, budget }: Props) {
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground truncate flex-1 mr-2">{categoryName}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <p className="text-xs text-red-500">
          ⚠️ Sobre presupuesto por {formatCurrency(spent - budget)}
        </p>
      )}
    </div>
  );
}
