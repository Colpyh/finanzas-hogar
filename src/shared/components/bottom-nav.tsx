"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Casa",       icon: "🏠", badge: false },
  { href: "/gastos-fijos",      label: "Fijos",      icon: "🧾", badge: false },
  { href: "/compras",           label: "Compras",    icon: "🛒", badge: false },
  { href: "/gastos-pendientes", label: "Pendientes", icon: "📥", badge: true  },
  { href: "/ajustes",           label: "Ajustes",    icon: "⚙️", badge: false },
];

type Props = {
  pendingCount?: number;
};

export function BottomNav({ pendingCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-row items-stretch bg-card border-t border-border"
      style={{
        height: 64,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 20px -8px rgba(40,20,80,0.15)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const showBadge = item.badge && pendingCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px]"
          >
            <span
              className="relative inline-flex items-center justify-center w-[44px] h-[28px] rounded-full transition-all duration-150"
              style={isActive ? { background: "rgba(124,58,237,0.1)" } : undefined}
            >
              <span className="text-[20px] leading-none">{item.icon}</span>
              {showBadge && (
                <span className="absolute -top-[2px] right-[2px] min-w-[15px] h-[15px] px-0.5 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center border-2 border-card">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </span>
            <span
              className={cn(
                "text-[9.5px] leading-none",
                isActive ? "font-bold text-primary" : "font-medium text-muted-foreground"
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
