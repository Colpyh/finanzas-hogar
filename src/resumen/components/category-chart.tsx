import { formatCurrency } from "@/shared/components/currency-display";

type CategoryItem = {
  categoryName: string;
  total: number;
};

type Props = {
  categories: CategoryItem[];
};

export function CategoryChart({ categories }: Props) {
  const sorted = [...categories].sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin categorías para mostrar</p>
    );
  }

  const maxTotal = sorted[0]?.total ?? 0;

  return (
    <ul className="space-y-2">
      {sorted.map((item) => (
        <li key={item.categoryName} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate">{item.categoryName}</span>
            <span className="ml-2 shrink-0">
              {formatCurrency(item.total)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: maxTotal > 0 ? `${(item.total / maxTotal) * 100}%` : "0%",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
