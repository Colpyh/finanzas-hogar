import { z } from "zod";

export const confirmPendingExpenseSchema = z.object({
  pendingExpenseId: z.string().uuid(),
  categoryId: z.string().uuid(),
  description: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(500).optional(),
});
export type ConfirmPendingExpenseInput = z.infer<
  typeof confirmPendingExpenseSchema
>;

export const discardPendingExpenseSchema = z.object({
  pendingExpenseId: z.string().uuid(),
});
export type DiscardPendingExpenseInput = z.infer<
  typeof discardPendingExpenseSchema
>;
