"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { analyzeFinances } from "@/insights/actions";
import type { FinancialInsights, InsightPoint } from "@/insights/types";

const POINT_STYLE: Record<InsightPoint["tipo"], { icon: string; cls: string }> = {
  positivo: { icon: "✅", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  alerta: { icon: "⚠️", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  idea: { icon: "💡", cls: "text-primary bg-primary/5 border-primary/20" },
};

export function InsightsPanel({ month }: { month: string }) {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await analyzeFinances(month);
        if (result.error) {
          setError(result.error);
          setInsights(null);
        } else {
          setInsights(result.insights ?? null);
        }
      } catch {
        setError("No se pudo generar el análisis. Intentá de nuevo.");
        setInsights(null);
      }
    });
  }

  return (
    <div className="bg-card border border-border rounded-[18px] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-[11px] bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={17} className="text-primary" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold text-foreground" style={{ letterSpacing: "-0.01em" }}>
              Análisis con IA
            </h2>
            <p className="text-[12px] text-muted-foreground leading-snug">
              Ideas sobre tus finanzas de este mes.
            </p>
          </div>
        </div>

        {(insights || error) && !isPending ? (
          <button
            onClick={run}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            <RefreshCw size={13} /> Volver a analizar
          </button>
        ) : (
          <button
            onClick={run}
            disabled={isPending}
            className="text-[13px] font-semibold text-white bg-primary rounded-[10px] px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
          >
            {isPending ? "Analizando…" : "Analizá mis finanzas"}
          </button>
        )}
      </div>

      {isPending && (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
      )}

      {!isPending && error && (
        <p className="mt-4 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[10px] p-3">
          {error}
        </p>
      )}

      {!isPending && insights && (
        <div className="mt-4 space-y-3">
          <p className="text-[16px] font-extrabold text-foreground" style={{ letterSpacing: "-0.01em" }}>
            {insights.titular}
          </p>
          <ul className="space-y-2">
            {insights.puntos.map((p, i) => {
              const style = POINT_STYLE[p.tipo];
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-[13px] leading-snug border rounded-[10px] p-2.5 ${style.cls}`}
                >
                  <span className="shrink-0">{style.icon}</span>
                  <span>{p.texto}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground pt-1">
            Generado por IA a partir de tus datos — puede equivocarse. No es asesoría financiera.
          </p>
        </div>
      )}
    </div>
  );
}
