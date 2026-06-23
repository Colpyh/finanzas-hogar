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
  Inbox,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/gastos-fijos", label: "Fijos", icon: Receipt },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/resumen", label: "Resumen", icon: BarChart2 },
  { href: "/gastos-pendientes", label: "Pendientes", icon: Inbox },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

type Props = {
  pendingCount?: number;
};

export function BottomNav({ pendingCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed z-50 bg-card border-border",
        "bottom-0 left-0 right-0 h-[72px] flex flex-row items-stretch border-t",
        "md:top-0 md:bottom-auto md:right-auto md:h-screen md:w-16 md:flex-col md:items-center md:pt-8 md:pb-6 md:gap-1 md:border-t-0 md:border-r"
      )}
      style={{ boxShadow: "0 -6px 24px -12px rgba(40,20,80,0.18)" }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        const showBadge = item.href === "/gastos-pendientes" && pendingCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative transition-colors",
              "flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px] rounded-[14px]",
              "md:flex-none md:w-14 md:py-3 md:rounded-xl md:gap-1",
              isActive
                ? "text-primary md:bg-primary/8"
                : "text-muted-foreground hover:text-foreground md:hover:bg-muted"
            )}
          >
            {/* Desktop active indicator */}
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {/* Icon with pill background on mobile active */}
            <span
              className={cn(
                "relative inline-flex items-center justify-center w-[46px] h-[30px] rounded-full transition-all duration-200",
                isActive ? "bg-primary/10" : ""
              )}
            >
              <Icon size={21} strokeWidth={isActive ? 2.5 : 1.75} />
              {showBadge && (
                <span className="absolute -top-[3px] right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center border-2 border-card">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </span>

            <span
              className={cn(
                "leading-none text-[9.5px]",
                isActive ? "font-semibold" : "font-medium"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
