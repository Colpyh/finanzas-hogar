import { z } from "zod";
import { receiptItemSchema } from "@/receipts/types";

const amountField = z
  .string()
  .min(1, "El monto es requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const createPurchaseSchema = z
  .object({
    description: z.string().min(1, "La descripción es requerida").max(200),
    categoryId: z.string().uuid("Categoría inválida"),
    amount: amountField,
    currency: z.string().default("CLP"),
    expenseDate: z.string().date("Fecha inválida"),
    responsibleId: z.string().uuid().nullable().optional(),
    cardId: z.string().uuid().nullable().optional(),
    isPrivate: z.boolean().default(false),
    isShared: z.boolean().default(false),
    // Boleta fotografiada (opcional)
    receiptItems: z.array(receiptItemSchema).max(200).optional(),
    receiptImagePath: z.string().max(300).optional(),
  })
  .refine((data) => !(data.isPrivate && data.isShared), {
    message: "Un gasto no puede ser privado y compartido a la vez",
    path: ["isShared"],
  });

export const createInstallmentSchema = z
  .object({
    description: z.string().min(1, "La descripción es requerida").max(200),
    categoryId: z.string().uuid("Categoría inválida"),
    currency: z.string().default("CLP"),
    installmentsTotal: z
      .number()
      .int()
      .min(2, "Debe tener al menos 2 cuotas"),
    installmentAmount: amountField,
    startMonth: z.string().date("Mes de inicio inválido"),
    responsibleId: z.string().uuid().nullable().optional(),
    cardId: z.string().uuid().nullable().optional(),
    isPrivate: z.boolean().default(false),
    isShared: z.boolean().default(false),
  })
  .refine((data) => !(data.isPrivate && data.isShared), {
    message: "Un gasto no puede ser privado y compartido a la vez",
    path: ["isShared"],
  })
  .transform((data) => ({
    ...data,
    amount: (Number(data.installmentAmount) * data.installmentsTotal).toFixed(2),
  }));

export const updateExpenseSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  amount: amountField.optional(),
  expenseDate: z.string().date().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  cardId: z.string().uuid().optional().nullable(),
});

export const updateInstallmentSchema = z.object({
  description: z.string().min(1, "La descripción es requerida").max(200),
  // Ausente para cuotas compartidas: ese contador se deriva, no se edita a
  // mano (ver shared/lib/db/installments.ts).
  installmentsPaid: z.number().int().min(0).optional(),
  isShared: z.boolean().optional(),
});

export type CreatePurchaseInput = z.input<typeof createPurchaseSchema>;
export type CreateInstallmentInput = z.input<typeof createInstallmentSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;
