import Link from "next/link";
import { formatCurrency } from "@/shared/components/currency-display";
import { ChevronRight } from "lucide-react";

type Purchase = {
  id: string;
  description: string;
  amount: number;
  expenseDate: string | null;
};

type Props = {
  purchases: Purchase[];
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function RecentPurchasesWidget({ purchases }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Compras recientes</h2>
        <Link
          href="/compras"
          className="text-xs text-primary font-medium hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin compras este mes</p>
      ) : (
        <ul className="divide-y divide-border -mx-4">
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              <Link
                href={`/gastos/${purchase.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{purchase.description}</p>
                  {purchase.expenseDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(purchase.expenseDate)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-foreground shrink-0">
                  {formatCurrency(purchase.amount)}
                </span>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
