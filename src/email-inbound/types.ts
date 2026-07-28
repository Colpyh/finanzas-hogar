import { z } from "zod";

export const confirmPendingExpenseSchema = z
  .object({
    pendingExpenseId: z.string().uuid(),
    categoryId: z.string().uuid(),
    description: z.string().trim().min(1).max(200),
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
