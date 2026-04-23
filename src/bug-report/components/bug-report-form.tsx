"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitBugReport } from "@/bug-report/actions";
import { Bug } from "lucide-react";

export function BugReportForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitBugReport({ title, description });
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setTitle("");
      setDescription("");
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bug size={15} />
        Reportar un problema
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label htmlFor="bug-title" className="text-sm">Título</Label>
        <Input
          id="bug-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: No puedo agregar un gasto"
          disabled={loading}
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bug-desc" className="text-sm">Descripción</Label>
        <textarea
          id="bug-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe qué pasó y cómo reproducirlo..."
          disabled={loading}
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 resize-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-600">Reporte enviado. ¡Gracias!</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" disabled={loading}>
          {loading ? "Enviando..." : "Enviar reporte"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
