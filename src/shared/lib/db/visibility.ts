import { eq, or } from "drizzle-orm";
import { expense } from "./schema";

/**
 * Un gasto privado (isPrivate=true) solo lo puede ver quien lo creó.
 * AND-ear esta condición en toda query que lea `expense` para un usuario
 * específico (listas, agregados de dashboard/resumen/categorías).
 */
export function visibleToUser(userId: string) {
  return or(eq(expense.isPrivate, false), eq(expense.createdBy, userId));
}
