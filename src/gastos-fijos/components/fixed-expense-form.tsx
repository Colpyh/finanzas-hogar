"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFixedExpenseSchema } from "@/gastos-fijos/types";
import { createFixedExpense } from "@/gastos-fijos/actions";

type Category = { id: string; name: string };

type Props = {
  categories: Category[];
};

export function FixedExpenseForm({ categories }: Props) {
  const [form, setForm] = useState({
    description: "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
    currency: "ARS",
    recurrenceDay: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createFixedExpenseSchema.safeParse({
      ...form,
      recurrenceDay: Number(form.recurrenceDay),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "general";
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await createFixedExpense(parsed.data);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Error al guardar" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ej: Alquiler"
          disabled={loading}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="category">Categoría</Label>
        <select
          id="category"
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          disabled={loading}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="amount">Monto estimado</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          placeholder="0.00"
          disabled={loading}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="recurrenceDay">Día de vencimiento (1–31)</Label>
        <Input
          id="recurrenceDay"
          type="number"
          min="1"
          max="31"
          value={form.recurrenceDay}
          onChange={(e) => set("recurrenceDay", e.target.value)}
          placeholder="10"
          disabled={loading}
        />
        {errors.recurrenceDay && <p className="text-xs text-destructive">{errors.recurrenceDay}</p>}
      </div>

      {errors.general && <p className="text-sm text-destructive">{errors.general}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando..." : "Crear gasto fijo"}
      </Button>
    </form>
  );
}
