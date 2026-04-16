"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addIncome } from "@/ingresos/actions";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { Loader2, RefreshCw, CalendarDays } from "lucide-react";

type Props = {
  month?: string;
  onSuccess?: () => void;
};

export function AddIncomeForm({ month, onSuccess }: Props) {
  const [type, setType] = useState<"salary" | "other">("salary");
  const [description, setDescription] = useState("Sueldo");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTypeChange(next: "salary" | "other") {
    setType(next);
    setDescription(next === "salary" ? "Sueldo" : "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addIncome({
        type,
        description,
        amount,
        periodMonth: month ?? currentPeriodMonth(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setAmount("");
        if (type === "other") setDescription("");
        onSuccess?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border">
        <button
          type="button"
          onClick={() => handleTypeChange("salary")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            type === "salary"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sueldo
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("other")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            type === "other"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Otro ingreso
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="income-description">Descripción</Label>
        <Input
          id="income-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={type === "salary" ? "Sueldo" : "Bono, freelance..."}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="income-amount">Monto</Label>
        <Input
          id="income-amount"
          type="number"
          inputMode="numeric"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Context hint */}
      <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${
        type === "salary"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}>
        {type === "salary" ? (
          <>
            <RefreshCw size={13} className="mt-0.5 shrink-0" />
            <span>Se repetirá automáticamente cada mes. Si cambia tu sueldo, ingresalo de nuevo y reemplazará al anterior.</span>
          </>
        ) : (
          <>
            <CalendarDays size={13} className="mt-0.5 shrink-0" />
            <span>Se registra solo para el mes seleccionado.</span>
          </>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 size={15} className="mr-2 animate-spin" />}
        {type === "salary" ? "Guardar sueldo" : "Agregar ingreso"}
      </Button>
    </form>
  );
}
