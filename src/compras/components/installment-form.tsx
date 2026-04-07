"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInstallmentSchema } from "@/compras/types";
import { createInstallment } from "@/compras/actions";
import { calculateInstallmentPreview } from "@/compras/installment-utils";

type Category = { id: string; name: string };
type Props = { categories: Category[] };

export function InstallmentForm({ categories }: Props) {
  const today = new Date().toISOString().slice(0, 7) + "-01";
  const [form, setForm] = useState({
    description: "",
    categoryId: categories[0]?.id ?? "",
    currency: "CLP",
    installmentsTotal: "",
    installmentAmount: "",
    startMonth: today,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  }

  const n = Number(form.installmentsTotal);
  const amt = Number(form.installmentAmount);
  const preview =
    n >= 2 && amt > 0
      ? calculateInstallmentPreview({ installmentsTotal: n, installmentAmount: amt }).preview
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createInstallmentSchema.safeParse({
      ...form,
      installmentsTotal: Number(form.installmentsTotal),
    });
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
      await createInstallment(parsed.data);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Error al guardar" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="inst-desc">Descripción</Label>
        <Input
          id="inst-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ej: Notebook Samsung"
          disabled={loading}
          className="h-11"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inst-cat">Categoría</Label>
        <select
          id="inst-cat"
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inst-n">Nº de cuotas</Label>
          <Input
            id="inst-n"
            type="number"
            min="2"
            value={form.installmentsTotal}
            onChange={(e) => set("installmentsTotal", e.target.value)}
            placeholder="12"
            disabled={loading}
            className="h-11"
          />
          {errors.installmentsTotal && <p className="text-xs text-destructive">{errors.installmentsTotal}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inst-amt">Monto por cuota</Label>
          <Input
            id="inst-amt"
            type="number"
            min="0"
            value={form.installmentAmount}
            onChange={(e) => set("installmentAmount", e.target.value)}
            placeholder="89990"
            disabled={loading}
            className="h-11"
          />
          {errors.installmentAmount && <p className="text-xs text-destructive">{errors.installmentAmount}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inst-start">Mes de inicio</Label>
        <Input
          id="inst-start"
          type="month"
          value={form.startMonth.slice(0, 7)}
          onChange={(e) => set("startMonth", e.target.value + "-01")}
          disabled={loading}
          className="h-11"
        />
      </div>

      {preview && (
        <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 text-sm font-medium text-primary text-center">
          {preview}
        </div>
      )}

      {errors.general && (
        <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
          {errors.general}
        </p>
      )}

      <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
        {loading ? "Guardando..." : "Registrar cuotas"}
      </Button>
    </form>
  );
}
