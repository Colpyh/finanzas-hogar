"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFixedExpenseSchema } from "@/gastos-fijos/types";
import { createFixedExpense } from "@/gastos-fijos/actions";

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type Props = { categories: Category[]; members: Member[] };

export function FixedExpenseForm({ categories, members }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    description: "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
    currency: "CLP",
    recurrenceDay: "",
    isShared: false,
    isPrivate: false,
    responsibleId: "" as string,
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
      responsibleId: form.responsibleId || null,
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
      router.push("/gastos-fijos");
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

      <button
        type="button"
        onClick={() => setForm((prev) => ({ ...prev, isShared: !prev.isShared }))}
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${form.isShared ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
        disabled={loading}
      >
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Gasto compartido</p>
          <p className="text-xs text-muted-foreground mt-0.5">Se divide entre los dos, uno lo paga</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.isShared ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isShared ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      <button
        type="button"
        onClick={() => setForm((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))}
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${form.isPrivate ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
        disabled={loading}
      >
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Gasto privado</p>
          <p className="text-xs text-muted-foreground mt-0.5">Solo tú lo verás</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.isPrivate ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isPrivate ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      {members.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="responsible">Responsable de pago</Label>
          <select
            id="responsible"
            value={form.responsibleId}
            onChange={(e) => set("responsibleId", e.target.value)}
            disabled={loading}
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          >
            <option value="">Sin responsable definido</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.displayName}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">¿Quién paga físicamente este gasto?</p>
        </div>
      )}

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
