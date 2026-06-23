"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useHousehold } from "@/shared/hooks/use-household";
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  BarChart2,
  Settings,
  Inbox,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  userEmail?: string;
};

function NavLinks({
  pathname,
  pendingCount = 0,
  onNavigate,
}: {
  pathname: string;
  pendingCount?: number;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        const showBadge =
          item.href === "/gastos-pendientes" && pendingCount > 0;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span className="relative shrink-0">
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.75} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span className="flex-1 text-left">Modo oscuro</span>
      <span
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0",
          isDark ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
            isDark ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

function UserFooter({ userEmail }: { userEmail?: string }) {
  const household = useHousehold();
  const initial = (userEmail ?? household.name).charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <span className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">
          {userEmail ? userEmail.split("@")[0] : "Usuario"}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{household.name}</p>
      </div>
    </div>
  );
}

export function AppNav({ pendingCount = 0, userEmail }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentLabel =
    NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label ??
    "Finanzas Hogar";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-56 flex-col bg-card border-r border-border">
        <div className="flex items-center h-14 px-5 border-b border-border shrink-0">
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Finanzas Hogar
          </span>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          <NavLinks pathname={pathname} pendingCount={pendingCount} />
        </nav>

        <div className="shrink-0 border-t border-border pb-2">
          <div className="px-3 pt-2">
            <DarkModeToggle />
          </div>
          <div className="mt-1 border-t border-border pt-1">
            <UserFooter userEmail={userEmail} />
          </div>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-3 gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col" showCloseButton={false}>
            <div className="flex items-center h-14 px-5 border-b border-border shrink-0">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                Finanzas Hogar
              </span>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              <NavLinks
                pathname={pathname}
                pendingCount={pendingCount}
                onNavigate={() => setOpen(false)}
              />
            </nav>
            <div className="shrink-0 border-t border-border pb-2">
              <div className="px-3 pt-2">
                <DarkModeToggle />
              </div>
              <div className="mt-1 border-t border-border pt-1">
                <UserFooter userEmail={userEmail} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-semibold text-sm text-foreground">
          {currentLabel}
        </span>
      </header>
    </>
  );
}
