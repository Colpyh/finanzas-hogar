"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiblePills } from "@/shared/components/responsible-pills";
import { CardPills } from "@/shared/components/card-pills";
import { createInstallmentSchema } from "@/compras/types";
import { createInstallment } from "@/compras/actions";
import { calculateInstallmentPreview } from "@/compras/installment-utils";

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type Card = { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; used: number };
type Props = { categories: Category[]; members: Member[]; cards?: Card[] };

export function InstallmentForm({ categories, members, cards = [] }: Props) {
  const today = new Date().toISOString().slice(0, 7) + "-01";
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [installmentsTotal, setInstallmentsTotal] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [startMonth, setStartMonth] = useState(today);
  const [responsibleId, setResponsibleId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const n = Number(installmentsTotal);
  const amt = Number(installmentAmount);
  const preview =
    n >= 2 && amt > 0
      ? calculateInstallmentPreview({ installmentsTotal: n, installmentAmount: amt }).preview
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createInstallmentSchema.safeParse({
      description,
      categoryId,
      currency: "CLP",
      installmentsTotal: Number(installmentsTotal),
      installmentAmount,
      startMonth,
      responsibleId,
      cardId,
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Notebook Samsung"
          disabled={loading}
          className="h-11"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger className="w-full h-11 rounded-xl px-3 text-sm">
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inst-n">Nº de cuotas</Label>
          <Input
            id="inst-n"
            type="number"
            min="2"
            value={installmentsTotal}
            onChange={(e) => setInstallmentsTotal(e.target.value)}
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
            value={installmentAmount}
            onChange={(e) => setInstallmentAmount(e.target.value)}
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
          value={startMonth.slice(0, 7)}
          onChange={(e) => setStartMonth(e.target.value + "-01")}
          disabled={loading}
          className="h-11"
        />
      </div>

      {preview && (
        <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 text-sm font-medium text-primary text-center">
          {preview}
        </div>
      )}

      {members.length > 0 && (
        <div className="space-y-1.5">
          <Label>Responsable de pago</Label>
          <ResponsiblePills
            members={members}
            value={responsibleId}
            onChange={setResponsibleId}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">¿Quién pone la tarjeta para estas cuotas?</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="space-y-1.5">
          <Label>Tarjeta</Label>
          <CardPills
            cards={cards}
            value={cardId}
            onChange={setCardId}
            disabled={loading}
          />
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
