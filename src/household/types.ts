import { z } from "zod";

export const updateHouseholdSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "Máximo 50 caracteres"),
});

export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
