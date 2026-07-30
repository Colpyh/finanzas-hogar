"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  one_time: "Compra puntual",
  installment: "Cuota",
  fixed: "Gasto fijo",
  variable: "Gasto variable",
};

type Props = {
  description: string;
  categoryName: string;
  type: "fixed" | "variable" | "installment" | "one_time";
  /** Signed URL (1h) de la boleta escaneada — null si no tiene. */
  receiptUrl?: string | null;
};

/**
 * Fragment (no wrapper div) a propósito: se usa junto a SettleButton dentro
 * de un flex row con `flex-wrap` — el bloque expandido lleva `w-full` para
 * saltar a su propia línea sin competir por ancho con el botón "Saldar".
 */
export function ItemDetailToggle({ description, categoryName, type, receiptUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        Detalle
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="w-full text-[12px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 space-y-1.5">
          <p>
            Descripción: <span className="text-foreground font-medium">{description}</span>
          </p>
          <p>
            Categoría: <span className="text-foreground font-medium">{categoryName}</span>
          </p>
          <p>
            Tipo: <span className="text-foreground font-medium">{TYPE_LABELS[type] ?? type}</span>
          </p>
          {receiptUrl && (
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="block pt-0.5">
              <img
                src={receiptUrl}
                alt="Boleta escaneada"
                className="rounded-lg border border-border max-h-40 w-auto"
              />
            </a>
          )}
        </div>
      )}
    </>
  );
}
