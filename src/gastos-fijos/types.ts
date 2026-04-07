import { z } from "zod";

const recurrenceDayField = z
  .number({ error: "Debe ser un número" })
  .int()
  .min(1, "Mínimo día 1")
  .max(31, "Máximo día 31");

const amountField = z
  .string()
  .min(1, "El monto es requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const createFixedExpenseSchema = z.object({
  description: z.string().min(1, "La descripción es requerida").max(200),
  categoryId: z.string().uuid("Categoría inválida"),
  amount: amountField,
  currency: z.string().default("ARS"),
  recurrenceDay: recurrenceDayField,
});

export const updateFixedExpenseSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  amount: amountField.optional(),
  currency: z.string().optional(),
  recurrenceDay: recurrenceDayField.optional(),
});

export const markPaidSchema = z.object({
  expenseId: z.string().uuid("ID de gasto inválido"),
  amount: amountField,
  notes: z.string().max(500).optional(),
});

export type CreateFixedExpenseInput = z.infer<typeof createFixedExpenseSchema>;
export type UpdateFixedExpenseInput = z.infer<typeof updateFixedExpenseSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
