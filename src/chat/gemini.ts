import "server-only";
import { geminiGenerateUrl } from "@/shared/lib/gemini";
import type { ChatMessage } from "./types";
import type { ChatToolDeclaration } from "./tools";

/**
 * Loop de chat con function calling de Gemini (mismo free tier y API key que
 * receipts/insights). El resto de la app depende SOLO de runChat → cambiar de
 * proveedor (Claude u otro) es reemplazar este archivo.
 *
 * Cada vuelta: Gemini responde texto (fin) o pide herramientas → se ejecutan
 * en el server y sus resultados vuelven como functionResponse. La última
 * vuelta fuerza texto (mode NONE) para no quedar en loop.
 */

type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  // thoughtSignature y otros campos de 2.5 viajan intactos de vuelta.
  [key: string]: unknown;
};

type Content = { role: "user" | "model"; parts: Part[] };

export type RunChatResult =
  | { ok: true; text: string }
  | { ok: false; reason: "quota" | "failed" };

type RunChatOptions = {
  system: string;
  history: ChatMessage[];
  tools: ChatToolDeclaration[];
  executeTool: (name: string, args: unknown) => Promise<Record<string, unknown>>;
  maxToolRounds?: number;
};

/** Lanza SOLO si falta GEMINI_API_KEY (configuración); todo lo demás es un RunChatResult. */
export async function runChat({
  system,
  history,
  tools,
  executeTool,
  maxToolRounds = 4,
}: RunChatOptions): Promise<RunChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const contents: Content[] = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  for (let round = 0; round <= maxToolRounds; round++) {
    const lastRound = round === maxToolRounds;

    let res: Response;
    try {
      res = await fetch(geminiGenerateUrl(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          tools: [{ functionDeclarations: tools }],
          toolConfig: { functionCallingConfig: { mode: lastRound ? "NONE" : "AUTO" } },
          generationConfig: { temperature: 0.3 },
        }),
      });
    } catch {
      return { ok: false, reason: "failed" };
    }

    if (res.status === 429) return { ok: false, reason: "quota" };
    if (!res.ok) {
      console.warn("[chat] gemini_http_error", { status: res.status });
      return { ok: false, reason: "failed" };
    }

    let content: Content | undefined;
    try {
      const json = (await res.json()) as { candidates?: Array<{ content?: Content }> };
      content = json.candidates?.[0]?.content;
    } catch {
      return { ok: false, reason: "failed" };
    }
    if (!content?.parts?.length) return { ok: false, reason: "failed" };

    const calls = content.parts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      const text = content.parts
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      return text ? { ok: true, text } : { ok: false, reason: "failed" };
    }

    // El turno del modelo vuelve tal cual (incluye thoughtSignature, requerido por 2.5).
    contents.push({ role: "model", parts: content.parts });
    const responses = await Promise.all(
      calls.map(async (p) => {
        const { name, args } = p.functionCall!;
        return { functionResponse: { name, response: await executeTool(name, args ?? {}) } };
      })
    );
    contents.push({ role: "user", parts: responses });
  }

  return { ok: false, reason: "failed" };
}
