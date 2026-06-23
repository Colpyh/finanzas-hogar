"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useHousehold } from "@/shared/hooks/use-household";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const PRIMARY_NAV = [
  { href: "/dashboard",     label: "Casa",       icon: "🏠" },
  { href: "/gastos-fijos",  label: "Fijos",      icon: "🧾" },
  { href: "/compras",       label: "Compras",    icon: "🛒" },
  { href: "/resumen",       label: "Resumen",    icon: "📊" },
  { href: "/ajustes",       label: "Ajustes",    icon: "⚙️" },
];

const SECONDARY_NAV = [
  { href: "/gastos-pendientes", label: "Pendientes", icon: "📥", badge: true },
  { href: "/balances",          label: "Balances",   icon: "⚖️", badge: false },
  { href: "/ingresos",          label: "Ingresos",   icon: "💰", badge: false },
];

type Props = {
  pendingCount?: number;
  userEmail?: string;
};

function NavItem({
  href,
  label,
  icon,
  isActive,
  badge,
  pendingCount,
  onClick,
}: {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  badge?: boolean;
  pendingCount?: number;
  onClick?: () => void;
}) {
  const showBadge = badge && (pendingCount ?? 0) > 0;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-[10px] rounded-xl text-sm font-semibold transition-all duration-150 w-full",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
      )}
      style={
        isActive
          ? {
              background: "rgba(124,58,237,0.08)",
              boxShadow: "inset 2.5px 0 0 #7c3aed",
            }
          : undefined
      }
    >
      <span className="text-[17px] leading-none shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {showBadge && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
          {(pendingCount ?? 0) > 99 ? "99+" : pendingCount}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  pathname,
  pendingCount = 0,
  userEmail,
  onNavigate,
}: {
  pathname: string;
  pendingCount?: number;
  userEmail?: string;
  onNavigate?: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const household = useHousehold();
  const initial = (userEmail ?? household.name).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border shrink-0">
        <div
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-[17px] shrink-0"
          style={{ background: "linear-gradient(135deg,#8b46f0,#6d28d9)" }}
        >
          💜
        </div>
        <span className="font-extrabold text-[15px] tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Finanzas Hogar
        </span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname.startsWith(item.href)}
            onClick={onNavigate}
          />
        ))}

        <div className="my-2 h-px bg-border mx-1" />

        {SECONDARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname.startsWith(item.href)}
            pendingCount={pendingCount}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border overflow-hidden">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center gap-3 py-[10px] rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors w-full"
          style={{ paddingLeft: 12, paddingRight: 12, margin: "8px 12px", width: "calc(100% - 24px)" }}
        >
          <span className="shrink-0 w-[17px] flex items-center justify-center">
            {isDark ? "☀️" : "🌙"}
          </span>
          <span className="flex-1 text-left">Modo oscuro</span>
          <span
            className={cn(
              "relative inline-flex shrink-0 w-9 h-5 rounded-full transition-colors duration-200",
              isDark ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                isDark ? "translate-x-4" : "translate-x-0"
              )}
            />
          </span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border">
          <span
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#8b46f0,#6d28d9)" }}
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate" style={{ letterSpacing: "-0.01em" }}>
              {userEmail ? userEmail.split("@")[0] : "Usuario"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{household.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppNav({ pendingCount = 0, userEmail }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentLabel =
    [...PRIMARY_NAV, ...SECONDARY_NAV].find((i) => pathname.startsWith(i.href))?.label ?? "Inicio";

  return (
    <>
      {/* Desktop sidebar — 252px */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-[252px] bg-card border-r border-border flex-col">
        <SidebarContent
          pathname={pathname}
          pendingCount={pendingCount}
          userEmail={userEmail}
        />
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-3 gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-[252px] p-0" showCloseButton={false}>
            <SidebarContent
              pathname={pathname}
              pendingCount={pendingCount}
              userEmail={userEmail}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-sm text-foreground" style={{ letterSpacing: "-0.01em" }}>
          {currentLabel}
        </span>
      </header>
    </>
  );
}
