import { formatCurrency } from "@/shared/components/currency-display";

const CATEGORY_EMOJIS: Record<string, string> = {
  "vivienda": "🏠",
  "alimentación": "🛒",
  "alimentacion": "🛒",
  "supermercado": "🛍️",
  "transporte": "🚗",
  "salud": "💊",
  "tecnología": "💻",
  "tecnologia": "💻",
  "entretenimiento": "🎬",
  "ropa": "👕",
  "educación": "📚",
  "educacion": "📚",
  "servicios": "⚡",
  "hogar": "🏡",
  "restaurantes": "🍽️",
  "viajes": "✈️",
};

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
    return <p className="text-sm text-muted-foreground">Sin categorías para mostrar</p>;
  }

  const maxTotal = sorted[0]?.total ?? 0;

  return (
    <div
      className="bg-card border border-border rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)", padding: "6px 16px" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-7">
        {sorted.map((item, i) => {
          const pct = maxTotal > 0 ? Math.round((item.total / maxTotal) * 100) : 0;
          const icon = CATEGORY_EMOJIS[item.categoryName.toLowerCase()] ?? "🏷️";
          const isLastLeft = i === sorted.length - 1 || (sorted.length % 2 === 1 && i === sorted.length - 1);
          const isLast = i === sorted.length - 1;
          return (
            <div
              key={item.categoryName}
              className="py-[12px]"
              style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-[7px]">
                <div className="flex items-center gap-[9px]">
                  <span className="text-[16px]">{icon}</span>
                  <span className="text-[14px] font-bold text-foreground">{item.categoryName}</span>
                </div>
                <span className="text-[14px] font-extrabold text-foreground num">
                  {formatCurrency(item.total)}
                </span>
              </div>
              <div
                className="h-[7px] rounded-[4px] overflow-hidden"
                style={{ background: "var(--card-2, #f4f2fb)" }}
              >
                <div
                  className="h-full rounded-[4px] transition-all duration-500"
                  style={{ width: `${pct}%`, background: "#8b46f0" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
