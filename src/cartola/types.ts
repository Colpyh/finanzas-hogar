import { z } from "zod";

/** Un movimiento de la cartola bancaria. */
export const cartolaMovementSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descripcion: z.string().min(1).max(200),
  // Monto en pesos, SIEMPRE positivo (el signo lo da `tipo`).
  monto: z.number().positive(),
  tipo: z.enum(["gasto", "ingreso", "transferencia", "otro"]),
});

export const cartolaExtractionSchema = z.object({
  movimientos: z.array(cartolaMovementSchema).max(1000),
});

export type CartolaMovement = z.infer<typeof cartolaMovementSchema>;
