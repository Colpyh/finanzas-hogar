"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFixedExpenseSchema } from "@/gastos-fijos/types";
import { createFixedExpense } from "@/gastos-fijos/actions";

type Category = { id: string; name: string };
type Props = { categories: Category[] };

export function FixedExpenseForm({ categories }: Props) {
  const [form, setForm] = useState({
    description: "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
    currency: "CLP",
    recurrenceDay: "",
    isShared: false,
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
      isShared: form.isShared,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]?.toString() ?? "general"] = issue.message;
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
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ej: Arriendo"
          disabled={loading}
          className="h-11"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Categoría</Label>
        <select
          id="category"
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          disabled={loading}
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto estimado (CLP)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          placeholder="Ej: 650000"
          disabled={loading}
          className="h-11"
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="recurrenceDay">Día de vencimiento</Label>
        <Input
          id="recurrenceDay"
          type="number"
          min="1"
          max="31"
          value={form.recurrenceDay}
          onChange={(e) => set("recurrenceDay", e.target.value)}
          placeholder="Ej: 5"
          disabled={loading}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">Entre 1 y 31</p>
        {errors.recurrenceDay && <p className="text-xs text-destructive">{errors.recurrenceDay}</p>}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-input bg-background px-4 h-11">
        <Label htmlFor="isShared" className="cursor-pointer">Gasto compartido</Label>
        <input
          id="isShared"
          type="checkbox"
          checked={form.isShared}
          onChange={(e) => setForm((prev) => ({ ...prev, isShared: e.target.checked }))}
          disabled={loading}
          className="h-4 w-4"
        />
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Cada miembro del hogar debe confirmar su parte
      </p>

      {errors.general && (
        <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
          {errors.general}
        </p>
      )}

      <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
        {loading ? "Guardando..." : "Crear gasto fijo"}
      </Button>
    </form>
  );
}
