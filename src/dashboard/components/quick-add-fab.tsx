"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function QuickAddFab() {
  return (
    <Link
      href="/compras/nuevo"
      aria-label="Agregar nuevo gasto"
      className="fixed bottom-20 right-4 md:bottom-6 z-50 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all"
      style={{ width: 56, height: 56 }}
    >
      <Plus size={24} strokeWidth={2.5} />
    </Link>
  );
}
