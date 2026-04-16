import { z } from "zod";

export const CARD_COLORS = [
  { value: "#6366f1", label: "Violeta" },
  { value: "#2563eb", label: "Azul" },
  { value: "#16a34a", label: "Verde" },
  { value: "#ea580c", label: "Naranja" },
  { value: "#db2777", label: "Rosa" },
  { value: "#475569", label: "Gris" },
] as const;

export const addCardSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50),
  lastFour: z.string().length(4, "Debe tener 4 dígitos").regex(/^\d+$/, "Solo dígitos").optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido").default("#6366f1"),
  creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido").optional().or(z.literal("")),
});

export type AddCardInput = z.infer<typeof addCardSchema>;

export const updateCardSchema = addCardSchema;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
