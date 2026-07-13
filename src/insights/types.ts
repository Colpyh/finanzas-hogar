import { z } from "zod";

/** Un punto del análisis: una observación clasificada. */
export const insightPointSchema = z.object({
  tipo: z.enum(["positivo", "alerta", "idea"]),
  texto: z.string().min(1).max(280),
});

/** Salida del análisis financiero generado por IA. */
export const financialInsightsSchema = z.object({
  titular: z.string().min(1).max(90),
  puntos: z.array(insightPointSchema).min(1).max(6),
});

export type InsightPoint = z.infer<typeof insightPointSchema>;
export type FinancialInsights = z.infer<typeof financialInsightsSchema>;

/**
 * Datos que se le mandan a la IA. SIN datos personales: solo números,
 * nombres de categorías y descripciones de cuotas (mismo criterio de
 * privacidad que el OCR de boletas, que ya manda imágenes a Gemini).
 */
export type InsightsInput = {
  mes: string; // etiqueta legible, ej. "julio 2026"
  ingresoMensual: number;
  totalGastado: number;
  gastoFijo: number;
  gastoVariable: number;
  gastoCuotas: number;
  categorias: { nombre: string; gastado: number; presupuesto: number | null }[];
  cuotasActivas: { descripcion: string; montoMensual: number; mesesRestantes: number }[];
  promedioMensualAnual: number;
  mesMasCaro: { mes: string; monto: number } | null;
};
