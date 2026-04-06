"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/gastos-fijos", label: "Fijos" },
  { href: "/compras", label: "Compras" },
  { href: "/resumen", label: "Resumen" },
  { href: "/ajustes", label: "Ajustes" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t flex h-16 z-50">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex-1 flex flex-col items-center justify-center text-xs gap-0.5 transition-colors",
            pathname.startsWith(item.href)
              ? "text-primary font-medium"
              : "text-muted-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
