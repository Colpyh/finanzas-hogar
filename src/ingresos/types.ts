import { z } from "zod";

const amountField = z
  .string()
  .min(1, "El monto es requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const addIncomeSchema = z.object({
  type: z.enum(["salary", "other"]),
  description: z.string().min(1, "La descripción es requerida").max(200),
  amount: amountField,
  periodMonth: z.string(), // 'YYYY-MM-01'
});

export type AddIncomeInput = z.infer<typeof addIncomeSchema>;
