"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
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
    <nav className="fixed left-0 top-0 h-screen w-16 bg-card/95 backdrop-blur-md border-r border-border flex flex-col items-center pt-8 pb-6 gap-1 z-50">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 w-14 py-3 rounded-xl transition-colors",
              isActive
                ? "text-primary bg-primary/8"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
            <span className={cn("text-[9px] leading-none", isActive ? "font-semibold" : "font-normal")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
