"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createPurchaseSchema } from "@/compras/types";
import { createPurchase } from "@/compras/actions";

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type Card = { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; used: number };
type Props = { categories: Category[]; members: Member[]; cards?: Card[] };

export function PurchaseForm({ categories, members, cards = [] }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0] ?? "";
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [responsibleId, setResponsibleId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createPurchaseSchema.safeParse({
      description,
      categoryId,
      amount,
      currency: "CLP",
      expenseDate,
      responsibleId,
      cardId,
      isPrivate,
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
      await createPurchase(parsed.data);
      router.push("/compras");
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Supermercado"
          disabled={loading}
          className="h-11"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger className="w-full h-11 rounded-xl px-3 text-sm">
            <SelectValue>
              {(v: string | null) => categories.find((c) => c.id === v)?.name ?? "Seleccionar categoría"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Monto (CLP)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
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
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          disabled={loading}
          className="h-11"
        />
      </div>

      {members.length > 0 && (
        <div className="space-y-1.5">
          <Label>Responsable de pago</Label>
          <ResponsiblePills
            members={members}
            value={responsibleId}
            onChange={setResponsibleId}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">¿Quién paga físicamente este gasto?</p>
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

      <button
        type="button"
        onClick={() => setIsPrivate((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
          isPrivate ? "border-primary/40 bg-primary/5" : "border-border bg-card"
        }`}
        disabled={loading}
      >
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Gasto privado</p>
          <p className="text-xs text-muted-foreground mt-0.5">Solo tú lo verás</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isPrivate ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
        {loading ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
