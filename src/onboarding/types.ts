import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "Máximo 50 caracteres"),
});

export const redeemInviteSchema = z.object({
  token: z.string().min(32, "Token inválido"),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;
