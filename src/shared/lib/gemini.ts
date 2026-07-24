import "server-only";
import type { z } from "zod";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiContent = { parts: GeminiPart[] };

type CallGeminiOptions<T> = {
  contents: GeminiContent[];
  responseSchema: object;
  /** Valida y tipa la respuesta cruda de Gemini (ya parseada de JSON). */
  schema: z.ZodType<T>;
  /** Prefijo de los console.warn en caso de fallo (ej. "receipts", "insights"). */
  logTag: string;
  temperature?: number;
};

/**
 * Llama a Gemini pidiendo JSON estructurado y valida la respuesta contra un
 * schema Zod. Devuelve null ante CUALQUIER fallo (red, HTTP, parseo, schema
 * mismatch) — nunca lanza, salvo que falte GEMINI_API_KEY (error de
 * configuración, no de runtime).
 *
 * receipts/gemini.ts, cartola/gemini.ts e insights/gemini.ts repetían este
 * mismo fetch+parseo tres veces; ahora cada uno solo define su prompt,
 * su responseSchema y su forma de dominio (ExtractedReceipt,
 * CartolaMovement[], FinancialInsights) — cambiar de proveedor de IA sigue
 * siendo reemplazar un archivo, pero ya no tres.
 */
export async function callGemini<T>({
  contents,
  responseSchema,
  schema,
  logTag,
  temperature = 0,
}: CallGeminiOptions<T>): Promise<T | null> {
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
          contents,
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      }
    );
  } catch {
    return null;
  }

  if (!res.ok) {
    console.warn(`[${logTag}] gemini_http_error`, { status: res.status });
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

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`[${logTag}] gemini_schema_mismatch`);
    return null;
  }
  return parsed.data;
}
