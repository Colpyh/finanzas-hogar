import { z } from "zod";

// Mismo validador que compras/types.ts::amountField — el parser de BCI
// puede fallar en detectar el monto (correo en un formato no reconocido),
// así que el usuario siempre puede completarlo/corregirlo a mano.
const amountField = z
  .string()
  .min(1, "El monto es requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const confirmPendingExpenseSchema = z
  .object({
    pendingExpenseId: z.string().uuid(),
    categoryId: z.string().uuid(),
    description: z.string().trim().min(1).max(200),
    amount: amountField,
    expenseDate: z.string().date("Fecha inválida"),
    notes: z.string().trim().max(500).optional(),
    isPrivate: z.boolean().default(false),
    isShared: z.boolean().default(false),
  })
  .refine((data) => !(data.isPrivate && data.isShared), {
    message: "Un gasto no puede ser privado y compartido a la vez",
    path: ["isShared"],
  });
export type ConfirmPendingExpenseInput = z.input<
  typeof confirmPendingExpenseSchema
>;

export const discardPendingExpenseSchema = z.object({
  pendingExpenseId: z.string().uuid(),
});
export type DiscardPendingExpenseInput = z.infer<
  typeof discardPendingExpenseSchema
>;
