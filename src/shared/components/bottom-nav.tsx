"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  BarChart2,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/gastos-fijos", label: "Fijos", icon: Receipt },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/resumen", label: "Resumen", icon: BarChart2 },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border flex h-16 z-50 safe-area-pb">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center text-xs gap-0.5 transition-colors min-h-[44px]",
              isActive
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 1.75}
              className={isActive ? "text-primary" : ""}
            />
            <span className={cn("text-[10px]", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
