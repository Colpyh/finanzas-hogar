import { formatCurrency } from "@/shared/components/currency-display";
import type { ActiveInstallment } from "@/dashboard/types";

type Props = {
  installments: ActiveInstallment[];
};

export function InstallmentsWidget({ installments }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Cuotas activas</h2>

      {installments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin cuotas activas</p>
      ) : (
        <ul className="space-y-3.5">
          {installments.map((item) => {
            const progress = Math.round((item.installmentsPaid / item.installmentsTotal) * 100);
            return (
              <li key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground truncate flex-1 mr-2">
                    {item.description}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {item.installmentsPaid}/{item.installmentsTotal} · {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">
                    {progress}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
