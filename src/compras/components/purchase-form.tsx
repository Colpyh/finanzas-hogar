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
    currency: "ARS",
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
      setErrors({ general: err instanceof Error ? err.message : "Error" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="desc">Descripción</Label>
        <Input id="desc" value={form.description} onChange={(e) => set("description", e.target.value)} disabled={loading} />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="cat">Categoría</Label>
        <select id="cat" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} disabled={loading} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="amount">Monto</Label>
        <Input id="amount" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} disabled={loading} />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" type="date" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} disabled={loading} />
      </div>
      {errors.general && <p className="text-sm text-destructive">{errors.general}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Guardando..." : "Registrar compra"}</Button>
    </form>
  );
}
