import type { FixedVsVariableBreakdown } from "@/resumen/types";
import { formatCurrency } from "@/shared/components/currency-display";

type Props = {
  breakdown: FixedVsVariableBreakdown;
};


export function FixedVariableBreakdown({ breakdown }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <div>
          <span className="font-medium">Fijos</span>
          <span className="ml-1 text-muted-foreground text-xs">
            ({breakdown.fixedPct}%)
          </span>
        </div>
        <span>{formatCurrency(breakdown.fixedAmount)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <div>
          <span className="font-medium">Cuotas</span>
          <span className="ml-1 text-muted-foreground text-xs">
            ({breakdown.installmentsPct}%)
          </span>
        </div>
        <span>{formatCurrency(breakdown.installmentsAmount)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <div>
          <span className="font-medium">Variables</span>
          <span className="ml-1 text-muted-foreground text-xs">
            ({breakdown.variablePct}%)
          </span>
        </div>
        <span>{formatCurrency(breakdown.variableAmount)}</span>
      </div>
    </div>
  );
}
