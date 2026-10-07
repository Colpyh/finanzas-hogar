import { z } from "zod";

/** Máximo de mensajes de historial que viajan a la IA por turno (cuida tokens del free tier). */
export const MAX_HISTORY = 12;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(2000),
});

/** Historial completo enviado desde el cliente: el ÚLTIMO mensaje es la pregunta nueva. */
export const chatHistorySchema = z
  .array(chatMessageSchema)
  .min(1)
  .max(60)
  .refine((h) => h[h.length - 1]?.role === "user", "El último mensaje debe ser del usuario");

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** 'YYYY-MM' que la IA pasa como argumento a las herramientas. */
export const toolMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
