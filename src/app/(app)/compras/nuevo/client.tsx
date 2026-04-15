"use client";

import { useState } from "react";
import Link from "next/link";
import { PurchaseForm } from "@/compras/components/purchase-form";
import { InstallmentForm } from "@/compras/components/installment-form";
import { Receipt, ShoppingCart, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type ExpenseType = "purchase" | "installment" | null;

const OPTIONS = [
  {
    type: "fixed" as const,
    label: "Gasto Fijo",
    desc: "Arriendo, servicios, suscripciones",
    icon: Receipt,
    href: "/gastos-fijos/nuevo",
  },
  {
    type: "purchase" as const,
    label: "Compra",
    desc: "Gasto puntual de una sola vez",
    icon: ShoppingCart,
    href: null,
  },
  {
    type: "installment" as const,
    label: "Cuotas",
    desc: "Compra financiada en N pagos",
    icon: CreditCard,
    href: null,
  },
];

export function NuevoCompraClient({ categories, members }: { categories: Category[]; members: Member[] }) {
  const [selected, setSelected] = useState<ExpenseType>(null);

  if (selected === "purchase") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Nueva compra</h1>
        </div>
        <PurchaseForm categories={categories} members={members} />
      </div>
    );
  }

  if (selected === "installment") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Compra en cuotas</h1>
        </div>
        <InstallmentForm categories={categories} members={members} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">¿Qué querés registrar?</h1>
        <p className="text-sm text-muted-foreground mt-1">Elegí el tipo de gasto</p>
      </div>

      <div className="space-y-5">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const inner = (
            <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-foreground">{opt.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
            </div>
          );

          if (opt.href) {
            return <Link key={opt.type} href={opt.href} className="block">{inner}</Link>;
          }
          return (
            <button key={opt.type} className="block w-full text-left" onClick={() => setSelected(opt.type as ExpenseType)}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
