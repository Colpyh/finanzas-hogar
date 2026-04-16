import { CreditCard, X } from "lucide-react";
import { formatCurrency } from "@/shared/components/currency-display";

type CardOption = {
  id: string;
  name: string;
  color: string;
  lastFour: string | null;
  creditLimit?: number | null;
  used?: number;
};

type Props = {
  cards: CardOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
};

export function CardPills({ cards, value, onChange, disabled }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50 ${
          value === null
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
        }`}
      >
        <X size={11} />
        Sin tarjeta
      </button>
      {cards.map((c) => {
        const isSelected = value === c.id;
        const available =
          c.creditLimit != null && c.used != null ? c.creditLimit - c.used : null;
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c.id)}
            title={available != null ? `${formatCurrency(available)} disponible` : c.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all disabled:opacity-50"
            style={
              isSelected
                ? { backgroundColor: c.color, borderColor: c.color, color: "#fff" }
                : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
            }
          >
            <CreditCard
              size={11}
              style={isSelected ? undefined : { color: c.color }}
            />
            {c.name}
            {c.lastFour && (
              <span className="opacity-70">···{c.lastFour}</span>
            )}
            {available != null && (
              <span className={`opacity-70 ${available < 0 ? "text-red-300" : ""}`}>
                {available < 0 ? "excedida" : `$${Math.round(available / 1000)}k`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
