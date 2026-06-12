import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";
import type { CategoryBudgetStatus } from "@/dashboard/types";

type Props = {
  categories: CategoryBudgetStatus[];
};

function barColorClass(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 80) return "bg-amber-400";
  return "bg-emerald-500";
}

export function BudgetAlertsWidget({ categories }: Props) {
  if (categories.length === 0) return null;

  const alertCount = categories.filter((c) => c.percentage >= 80).length;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          Presupuestos
          {alertCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
              {alertCount}
            </span>
          )}
        </h2>
        <Link href="/ajustes" className="text-xs text-primary font-medium hover:underline">
          Editar
        </Link>
      </div>

      <ul className="space-y-3">
        {categories.map((cat) => (
          <li key={cat.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground flex items-center gap-1.5">
                {cat.icon && <span aria-hidden>{cat.icon}</span>}
                {cat.name}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(cat.spent)}{" "}
                <span className="opacity-50">/</span>{" "}
                {formatCurrency(cat.monthlyBudget)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColorClass(cat.percentage)}`}
                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
              />
            </div>
            {cat.percentage >= 100 && (
              <p className="text-xs text-red-500 mt-0.5">
                Excedido en {formatCurrency(cat.spent - cat.monthlyBudget)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
