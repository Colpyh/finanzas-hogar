"use client";

import {
  getPrevMonth,
  getNextMonth,
  formatMonthLabel,
} from "@/resumen/month-utils";

type Props = {
  month: string; // 'YYYY-MM'
  onChange: (month: string) => void;
};

export function MonthPicker({ month, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onChange(getPrevMonth(month))}
        className="p-2 rounded hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Mes anterior"
      >
        ←
      </button>
      <span className="text-sm font-medium capitalize">
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        onClick={() => onChange(getNextMonth(month))}
        className="p-2 rounded hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Mes siguiente"
      >
        →
      </button>
    </div>
  );
}
