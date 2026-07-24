import "server-only";
import { callGemini } from "@/shared/lib/gemini";
import { extractedReceiptSchema, type ExtractedReceipt } from "./types";

/**
 * Implementación Gemini del extractor de boletas (free tier de Google).
 *
 * Elegido por costo (free tier, decisión del usuario jul-2026). El resto de
 * la app depende SOLO de la forma ExtractedReceipt — cambiar de proveedor
 * (Claude u otro) es reemplazar este archivo, igual que el patrón
 * normalizeInboundPayload de email-inbound.
 */

const PROMPT = `Eres un extractor de datos de boletas chilenas (formato SII).
Analiza la imagen y devuelve JSON con:
- merchant: nombre del comercio (el nombre de fantasía, no la razón social)
- total: el TOTAL FINAL pagado en pesos chilenos, como número entero sin puntos
- date: fecha de la compra en formato YYYY-MM-DD
- items: las líneas de detalle, cada una con description (expandí abreviaturas
  de forma conservadora, ej. "PAN MOLD INTEG" → "Pan de molde integral"),
  quantity (número, o null si la línea no indica cantidad) y total (el total
  de ESA línea en pesos, negativo si es un descuento)
Si una parte es ilegible, omití esas líneas de items — nunca inventes datos.
El total impreso en la boleta manda siempre.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING" },
    total: { type: "NUMBER" },
    date: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          quantity: { type: "NUMBER", nullable: true },
          total: { type: "NUMBER" },
        },
        required: ["description", "total"],
      },
    },
  },
  required: ["merchant", "total", "date", "items"],
};

/**
 * Devuelve null si la boleta no se pudo leer (foto mala, respuesta inválida,
 * rate limit). Lanza SOLO por error de configuración (falta la API key).
 */
export async function extractReceiptWithGemini(
  imageBase64: string,
  mimeType: string
): Promise<ExtractedReceipt | null> {
  return callGemini({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: PROMPT },
        ],
      },
    ],
    responseSchema: RESPONSE_SCHEMA,
    schema: extractedReceiptSchema,
    logTag: "receipts",
  });
}
