import { formatCurrency } from "@/shared/components/currency-display";
import type { ActiveInstallment } from "@/dashboard/types";

type Props = {
  installments: ActiveInstallment[];
  currentUserId?: string;
  memberNames?: Record<string, string>;
};

export function InstallmentsWidget({ installments }: Props) {
  const totalMonthly = installments.reduce((s, i) => s + i.amount, 0);

  return (
    <div
      className="rounded-[20px] bg-card border border-border p-4 flex flex-col gap-[13px]"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.3px] text-muted-foreground">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/>
          </svg>
          Cuotas activas
        </span>
        {installments.length > 0 && (
          <span className="text-[11px] font-semibold text-muted-foreground num">
            {formatCurrency(totalMonthly)}/mes
          </span>
        )}
      </div>

      {installments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin cuotas activas</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {installments.map((item) => {
            const progress = Math.round((item.installmentsPaid / item.installmentsTotal) * 100);
            return (
              <div key={item.id} className="flex items-center gap-3 py-[7px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold truncate">{item.description}</span>
                    <span className="text-[15px] font-extrabold num flex-shrink-0 ml-2">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden mt-[7px]" style={{ background: "var(--muted)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #7c3aed, #6d28d9)",
                      }}
                    />
                  </div>
                  <div className="text-[10.5px] text-muted-foreground mt-1">
                    Cuota {item.installmentsPaid} de {item.installmentsTotal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
