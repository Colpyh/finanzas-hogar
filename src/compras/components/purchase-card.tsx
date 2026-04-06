import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: string;
    expenseDate: string | null;
    categoryName?: string;
  };
};

export function PurchaseCard({ expense }: Props) {
  return (
    <Link href={`/gastos/${expense.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-medium">{expense.description}</p>
            {expense.categoryName && (
              <p className="text-xs text-muted-foreground">{expense.categoryName}</p>
            )}
            {expense.expenseDate && (
              <p className="text-xs text-muted-foreground">{expense.expenseDate}</p>
            )}
          </div>
          <span className="font-mono text-sm shrink-0">${expense.amount}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
