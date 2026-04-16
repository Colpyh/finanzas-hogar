"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";

function offsetMonth(monthStr: string, delta: number): string {
  const parts = monthStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type Props = {
  month: string;
};

export function MonthSelector({ month }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const label = new Date(`${month}T12:00:00`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const isCurrentMonth = month === currentPeriodMonth();

  function navigate(delta: number) {
    const next = offsetMonth(month, delta);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(-1)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium capitalize min-w-[120px] text-center">
        {label}
      </span>
      <button
        onClick={() => navigate(1)}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Mes siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
