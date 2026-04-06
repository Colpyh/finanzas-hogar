"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseForm } from "@/compras/components/purchase-form";
import { InstallmentForm } from "@/compras/components/installment-form";

type Category = { id: string; name: string };
type ExpenseType = "fixed" | "purchase" | "installment" | null;

export function NuevoCompraClient({ categories }: { categories: Category[] }) {
  const [selected, setSelected] = useState<ExpenseType>(null);

  if (selected === "purchase") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-6">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground">← Volver</button>
        <h1 className="text-2xl font-semibold">Nueva compra</h1>
        <PurchaseForm categories={categories} />
      </div>
    );
  }

  if (selected === "installment") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-6">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground">← Volver</button>
        <h1 className="text-2xl font-semibold">Compra en cuotas</h1>
        <InstallmentForm categories={categories} />
      </div>
    );
  }

  // Type selector
  const options = [
    { type: "fixed" as const, label: "Gasto Fijo", desc: "Alquiler, servicios, suscripciones", href: "/gastos-fijos/nuevo" },
    { type: "purchase" as const, label: "Compra", desc: "Gasto de una sola vez", href: null },
    { type: "installment" as const, label: "Cuotas", desc: "Compra financiada en N pagos", href: null },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">¿Qué querés registrar?</h1>
      <div className="space-y-3">
        {options.map((opt) =>
          opt.href ? (
            <Link key={opt.type} href={opt.href}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={opt.type} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelected(opt.type)}>
              <CardContent className="p-4">
                <p className="font-medium">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
