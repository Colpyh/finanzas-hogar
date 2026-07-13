import "server-only";
import { cartolaExtractionSchema, type CartolaMovement } from "./types";

/**
 * Extrae los movimientos de una cartola bancaria en PDF vía Gemini (free tier,
 * misma API key que el OCR de boletas). Mismo patrón que receipts/gemini e
 * insights/gemini: cambiar de proveedor = reemplazar este archivo.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const PROMPT = `Eres un extractor de cartolas bancarias chilenas (BCI y similares).
Analiza el PDF y devuelve TODOS los movimientos como JSON. Para cada uno:
- fecha: en formato YYYY-MM-DD
- descripcion: la glosa / comercio del movimiento
- monto: el valor en pesos chilenos como número entero POSITIVO, sin signo ni
  puntos (el signo lo indica "tipo")
- tipo: clasifícalo como
  - "gasto": cargos, compras con tarjeta, pagos automáticos (PAC/PAT), giros
  - "ingreso": abonos, sueldos, depósitos, transferencias RECIBIDAS
  - "transferencia": traspasos entre cuentas propias
  - "otro": comisiones, impuestos, intereses
Reglas: nunca inventes datos; si una línea es ilegible, omítela. No incluyas
saldos ni totales, solo movimientos.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    movimientos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fecha: { type: "STRING" },
          descripcion: { type: "STRING" },
          monto: { type: "NUMBER" },
          tipo: { type: "STRING", enum: ["gasto", "ingreso", "transferencia", "otro"] },
        },
        required: ["fecha", "descripcion", "monto", "tipo"],
      },
    },
  },
  required: ["movimientos"],
};

/**
 * Devuelve null si la cartola no se pudo leer. Lanza SOLO por config faltante.
 */
export async function extractCartolaMovements(
  pdfBase64: string
): Promise<CartolaMovement[] | null> {
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
                { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
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
    console.warn("[cartola] gemini_http_error", { status: res.status });
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

  const parsed = cartolaExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[cartola] gemini_schema_mismatch");
    return null;
  }
  return parsed.data.movimientos;
}
