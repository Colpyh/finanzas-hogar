"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function QuickAddFab() {
  // Mobile: flota por ENCIMA del bottom nav (64px + safe area) — antes quedaba
  // tapado detrás. Desktop (md:) no tiene nav inferior, vuelve a bottom-6.
  return (
    <Link
      href="/compras/nuevo"
      aria-label="Agregar nuevo gasto"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] md:bottom-6 right-4 z-[60] flex items-center justify-center text-white hover:-translate-y-0.5 hover:rotate-90 active:scale-95 transition-all duration-150"
      style={{
        width: 52,
        height: 52,
        borderRadius: 17,
        background: "linear-gradient(135deg, #8b46f0, #6d28d9)",
        boxShadow: "var(--shadow-violet)",
      }}
    >
      <Plus size={24} strokeWidth={2.5} />
    </Link>
  );
}
