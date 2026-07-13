import "server-only";
import {
  financialInsightsSchema,
  type FinancialInsights,
  type InsightsInput,
} from "./types";

/**
 * Análisis financiero del hogar vía Gemini (free tier de Google, misma API key
 * que el OCR de boletas). El resto de la app depende SOLO de la forma
 * FinancialInsights — cambiar de proveedor (Claude u otro) es reemplazar este
 * archivo, igual que receipts/gemini.ts y el normalizeInboundPayload de email.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const SYSTEM = `Eres un asesor de finanzas del hogar en Chile, cercano y directo.
Te paso los números de UN mes de un hogar (en pesos chilenos) más su promedio
anual. Devuelve un análisis breve y CONCRETO en español chileno neutro.

Reglas:
- Basáte SOLO en los datos entregados. Nunca inventes cifras ni categorías.
- Sé específico con números reales del hogar (montos, %, meses), no consejos
  genéricos tipo "ahorra más".
- "titular": 3 a 7 palabras que resuman el mes (ej. "Mes controlado" o
  "Ojo con Alimentación").
- "puntos": 3 a 5 observaciones, cada una una frase. Clasifica cada una:
  "positivo" (algo que va bien), "alerta" (un riesgo o exceso) o "idea"
  (una sugerencia accionable). Mezcla los tipos cuando los datos lo permitan.
- Si el gasto total supera al ingreso, eso SIEMPRE es una alerta.
- Compara el total del mes contra el promedio anual cuando aporte.
- Si una categoría supera su presupuesto, menciónalo con el monto excedido.
- Montos en pesos, sin decimales, con separador de miles (ej. $135.000).`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    titular: { type: "STRING" },
    puntos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          tipo: { type: "STRING", enum: ["positivo", "alerta", "idea"] },
          texto: { type: "STRING" },
        },
        required: ["tipo", "texto"],
      },
    },
  },
  required: ["titular", "puntos"],
};

/**
 * Devuelve null si la IA no pudo responder (rate limit, respuesta inválida,
 * red). Lanza SOLO por error de configuración (falta la API key).
 */
export async function generateFinancialInsights(
  input: InsightsInput
): Promise<FinancialInsights | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `${SYSTEM}\n\nDatos del hogar (JSON):\n${JSON.stringify(input)}`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
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
    console.warn("[insights] gemini_http_error", { status: res.status });
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

  const parsed = financialInsightsSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[insights] gemini_schema_mismatch");
    return null;
  }
  return parsed.data;
}
