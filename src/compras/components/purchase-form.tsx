"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchaseSchema } from "@/compras/types";
import { createPurchase } from "@/compras/actions";

type Category = { id: string; name: string };
type Props = { categories: Category[] };

export function PurchaseForm({ categories }: Props) {
  const today = new Date().toISOString().split("T")[0] ?? "";
  const [form, setForm] = useState({
    description: "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
    currency: "CLP",
    expenseDate: today,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createPurchaseSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0]?.toString() ?? "general"] = i.message;
      });
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await createPurchase(parsed.data);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Error al guardar" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="desc">Descripción</Label>
        <Input
          id="desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ej: Supermercado"
          disabled={loading}
          className="h-11"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat">Categoría</Label>
        <select
          id="cat"
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          disabled={loading}
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto (CLP)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          placeholder="Ej: 45000"
          disabled={loading}
          className="h-11"
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          value={form.expenseDate}
          onChange={(e) => set("expenseDate", e.target.value)}
          disabled={loading}
          className="h-11"
        />
      </div>

      {errors.general && (
        <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
          {errors.general}
        </p>
      )}

      <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
        {loading ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
