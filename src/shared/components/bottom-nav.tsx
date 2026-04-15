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
    <nav className={cn(
      "fixed z-50 bg-card/95 backdrop-blur-md border-border",
      // Mobile: bottom bar
      "bottom-0 left-0 right-0 h-16 flex flex-row items-stretch border-t",
      // md+: left sidebar
      "md:top-0 md:bottom-auto md:right-auto md:h-screen md:w-16 md:flex-col md:items-center md:pt-8 md:pb-6 md:gap-1 md:border-t-0 md:border-r"
    )}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative transition-colors",
              // Mobile: horizontal equal slots
              "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px]",
              // md+: vertical pill buttons
              "md:flex-none md:w-14 md:py-3 md:rounded-xl md:gap-1",
              isActive
                ? "text-primary md:bg-primary/8"
                : "text-muted-foreground hover:text-foreground md:hover:bg-muted"
            )}
          >
            {/* Mobile active indicator: top bar */}
            {isActive && (
              <span className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
            )}
            {/* Desktop active indicator: left bar (animated) */}
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
            <span className={cn(
              "leading-none",
              "text-[10px] md:text-[9px]",
              isActive ? "font-semibold" : "font-normal"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
