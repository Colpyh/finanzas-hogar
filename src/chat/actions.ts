"use server";

import { requireHousehold } from "@/household/guards";
import { getHouseholdMembers } from "@/household/queries";
import { currentMonth } from "@/resumen/month-utils";
import { buildMemberAliases } from "./aliases";
import { runChat } from "./gemini";
import { buildChatSystemPrompt } from "./prompt";
import { CHAT_TOOL_DECLARATIONS, executeChatTool, type ChatToolContext } from "./tools";
import { chatHistorySchema, MAX_HISTORY } from "./types";

/**
 * Un turno del chat: recibe el historial (último = pregunta nueva) y devuelve
 * la respuesta de la IA. Efímero — el historial vive en el cliente, nada se
 * persiste. Solo lectura: las herramientas no mutan nada.
 */
export async function sendChatMessage(
  rawHistory: unknown
): Promise<{ reply?: string; error?: string }> {
  const parsed = chatHistorySchema.safeParse(rawHistory);
  if (!parsed.success) return { error: "Mensaje inválido" };

  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { user, household } = auth;

  try {
    const members = await getHouseholdMembers(household.id);
    const aliases = buildMemberAliases(members, user.id);

    // Ventana acotada; Gemini espera que la conversación empiece con un turno del usuario.
    const window = parsed.data.slice(-MAX_HISTORY);
    const firstUser = window.findIndex((m) => m.role === "user");
    const history = window
      .slice(firstUser)
      .map((m) => ({ role: m.role, text: aliases.toAlias(m.text) }));

    const ctx: ChatToolContext = {
      householdId: household.id,
      userId: user.id,
      members,
      aliases,
    };

    const result = await runChat({
      system: buildChatSystemPrompt({
        today: new Intl.DateTimeFormat("es-CL", {
          dateStyle: "full",
          timeZone: "America/Santiago",
        }).format(new Date()),
        currentMonth: currentMonth(),
        memberCount: members.length,
      }),
      history,
      tools: CHAT_TOOL_DECLARATIONS,
      executeTool: (name, args) => executeChatTool(ctx, name, args),
    });

    if (!result.ok) {
      return {
        error:
          result.reason === "quota"
            ? "Se alcanzó el límite de uso de la IA. Intenta de nuevo en un rato."
            : "No pude responder ahora. Intenta de nuevo en un momento.",
      };
    }
    return { reply: aliases.toReal(result.text) };
  } catch (err) {
    if (err instanceof Error && err.message.includes("GEMINI_API_KEY")) {
      console.error("[chat] missing GEMINI_API_KEY");
      return { error: "El asistente no está configurado todavía." };
    }
    console.error("[chat] unexpected_error", err);
    return { error: "Error inesperado" };
  }
}
