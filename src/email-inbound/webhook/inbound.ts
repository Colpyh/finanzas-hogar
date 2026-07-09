import { z } from "zod";
import { postmarkInboundSchema } from "./postmark";

/**
 * Forma común de un correo entrante, independiente del proveedor.
 * El route trabaja SOLO contra esta forma — agregar un proveedor nuevo
 * es agregar un schema + una rama en normalizeInboundPayload.
 */
export type NormalizedInbound = {
  from: string;
  subject: string;
  messageId: string | null;
  date: string | null;
  textBody: string | null;
  htmlBody: string | null;
  provider: "postmark" | "cloudmailin";
};

// CloudMailin "JSON Normalized": headers en minúsculas, cuerpo en plain/html.
// envelope.from es el remitente SMTP real; headers.from el display ("BCI <...>").
const cloudmailinInboundSchema = z.object({
  envelope: z.object({ from: z.string().optional() }),
  headers: z.record(z.string(), z.unknown()).optional(),
  plain: z.string().nullish(),
  html: z.string().nullish(),
});

function headerValue(
  headers: Record<string, unknown> | undefined,
  ...names: string[]
): string | null {
  if (!headers) return null;
  const lower = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  for (const name of names) {
    const v = lower.get(name.toLowerCase());
    if (typeof v === "string" && v) return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  }
  return null;
}

/** Devuelve null si el payload no matchea ningún proveedor conocido. */
export function normalizeInboundPayload(json: unknown): NormalizedInbound | null {
  // Postmark primero: sus campos From/Subject son requeridos, no hay ambigüedad.
  const pm = postmarkInboundSchema.safeParse(json);
  if (pm.success) {
    return {
      from: pm.data.From,
      subject: pm.data.Subject,
      messageId: pm.data.MessageID ?? null,
      date: pm.data.Date ?? null,
      textBody: pm.data.TextBody ?? null,
      htmlBody: pm.data.HtmlBody ?? null,
      provider: "postmark",
    };
  }

  const cm = cloudmailinInboundSchema.safeParse(json);
  if (cm.success) {
    const from = headerValue(cm.data.headers, "from") ?? cm.data.envelope.from ?? "";
    if (!from) return null;
    return {
      from,
      subject: headerValue(cm.data.headers, "subject") ?? "",
      messageId: headerValue(cm.data.headers, "message_id", "message-id"),
      date: headerValue(cm.data.headers, "date"),
      textBody: cm.data.plain ?? null,
      htmlBody: cm.data.html ?? null,
      provider: "cloudmailin",
    };
  }

  return null;
}
