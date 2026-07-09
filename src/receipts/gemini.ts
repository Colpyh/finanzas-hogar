import "server-only";
import { extractedReceiptSchema, type ExtractedReceipt } from "./types";

/**
 * Implementación Gemini del extractor de boletas (free tier de Google).
 *
 * Elegido por costo (free tier, decisión del usuario jul-2026). El resto de
 * la app depende SOLO de la forma ExtractedReceipt — cambiar de proveedor
 * (Claude u otro) es reemplazar este archivo, igual que el patrón
 * normalizeInboundPayload de email-inbound.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );
  } catch {
    return null;
  }

  if (!res.ok) {
    console.warn("[receipts] gemini_http_error", { status: res.status });
    return null;
  }

  let raw: unknown;
  try {
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = extractedReceiptSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[receipts] gemini_schema_mismatch");
    return null;
  }
  return parsed.data;
}
