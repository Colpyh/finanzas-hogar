import { z } from "zod";

/** Línea de detalle de una boleta. `total` puede ser negativo (descuentos). */
export const receiptItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().positive().nullable(),
  total: z.number(),
});

export type ReceiptItem = z.infer<typeof receiptItemSchema>;

/** Resultado de la extracción de una boleta (independiente del proveedor de IA). */
export const extractedReceiptSchema = z.object({
  merchant: z.string().min(1).max(200),
  /** Total final pagado en CLP (el impreso en la boleta, manda siempre). */
  total: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  items: z.array(receiptItemSchema),
});

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;

/**
 * ¿La suma del detalle cuadra con el total impreso? Si no, la UI marca el
 * detalle como "revisar" — el total impreso manda SIEMPRE, nunca inventamos
 * plata. Sin ítems no hay nada que contradiga al total.
 */
export function itemsMatchTotal(items: ReceiptItem[], total: number): boolean {
  if (items.length === 0) return true;
  const sum = items.reduce((acc, i) => acc + i.total, 0);
  return Math.abs(sum - total) <= 1; // tolerancia $1 por redondeos
}
