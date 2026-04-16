import { CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/shared/components/currency-display";
import { OwnerTag } from "./owner-tag";
import type { FixedBillWithStatus } from "@/dashboard/types";

type Props = {
  bills: FixedBillWithStatus[];
  currentUserId?: string;
  memberNames?: Record<string, string>;
};

export function FixedExpensesWidget({ bills, currentUserId = "", memberNames = {} }: Props) {
  const paid = bills.filter((b) => b.paid).length;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Gastos Fijos</h2>
        {bills.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {paid}/{bills.length} pagados
          </span>
        )}
      </div>

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin gastos fijos registrados</p>
      ) : (
        <ul className="space-y-2.5">
          {bills.map((bill) => (
            <li key={bill.id} className="flex items-center gap-2">
              {bill.paid ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <Clock size={16} className="text-amber-500 shrink-0" />
              )}
              <span className="flex-1 text-sm text-foreground truncate">
                {bill.description}
              </span>
              <OwnerTag
                responsibleId={bill.responsibleId}
                currentUserId={currentUserId}
                memberNames={memberNames}
              />
              <span
                className={`text-sm font-medium shrink-0 ${
                  bill.paid ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {formatCurrency(bill.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
