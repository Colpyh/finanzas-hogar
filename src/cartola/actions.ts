"use server";

import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { db } from "@/shared/lib/db";
import { pendingExpense, expense } from "@/shared/lib/db/schema";
import { hhTag } from "@/shared/lib/cache-tags";
import { extractCartolaMovements } from "./gemini";
import type { CartolaMovement } from "./types";

// El texto de una cartola (ya extraído en el cliente) es chico; guard contra
// payloads anómalos.
const MAX_TEXT_LENGTH = 500_000;
// Ventana de días para considerar dos movimientos "el mismo" (la fecha de la
// cartola puede diferir 1-2 días de la fecha de compra que llegó por correo).
const DEDUP_DAY_WINDOW = 2;

export type ImportCartolaResult = {
  error?: string;
  imported?: number;
  /** Gastos que ya existían (correo o cartola previa) — no se re-importan. */
  duplicates?: number;
  /** Ingresos / transferencias / comisiones — se ignoran (solo importamos gastos). */
  nonExpenses?: number;
};

function movementHash(householdId: string, m: CartolaMovement): string {
  return createHash("sha256")
    .update(`cartola:${householdId}:${m.fecha}:${m.monto}:${m.descripcion}`)
    .digest("hex");
}

function daysApart(a: string, b: string): number {
  const ms = Math.abs(new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime());
  return ms / 86_400_000;
}

export async function importCartola(cartolaText: string): Promise<ImportCartolaResult> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tenés un hogar activo" };
  if (!cartolaText || cartolaText.length > MAX_TEXT_LENGTH) {
    return { error: "La cartola está vacía o es demasiado grande." };
  }

  const movements = await extractCartolaMovements(cartolaText);
  if (!movements) return { error: "No se pudo leer la cartola. Probá con otro PDF." };

  const gastos = movements.filter((m) => m.tipo === "gasto");
  const nonExpenses = movements.length - gastos.length;
  if (gastos.length === 0) return { imported: 0, duplicates: 0, nonExpenses };

  // Existentes del hogar (pendientes + gastos vivos) para deduplicar por
  // monto + fecha (± ventana). Evita el doble conteo con lo que ya entró por
  // correo o en una subida previa de cartola.
  const [existingPending, existingExpenses] = await Promise.all([
    db
      .select({ amount: pendingExpense.parsedAmount, date: pendingExpense.parsedDate })
      .from(pendingExpense)
      .where(eq(pendingExpense.householdId, household.id)),
    db
      .select({ amount: expense.amount, date: expense.expenseDate })
      .from(expense)
      .where(and(eq(expense.householdId, household.id), isNull(expense.deletedAt))),
  ]);

  const existing = [...existingPending, ...existingExpenses]
    .filter((r): r is { amount: string; date: string } => Boolean(r.amount && r.date))
    .map((r) => ({ amount: Math.round(Number(r.amount)), date: r.date }));

  function isDuplicate(m: CartolaMovement): boolean {
    const monto = Math.round(m.monto);
    return existing.some(
      (e) => e.amount === monto && daysApart(e.date, m.fecha) <= DEDUP_DAY_WINDOW
    );
  }

  const toInsert = gastos
    .filter((m) => !isDuplicate(m))
    .map((m) => ({
      householdId: household.id,
      rawPayload: m,
      payloadHash: movementHash(household.id, m),
      parsedAmount: String(m.monto),
      parsedDate: m.fecha,
      parsedMerchant: m.descripcion,
      parsedSource: "bci" as const,
      status: "pending" as const,
    }));

  let imported = 0;
  if (toInsert.length > 0) {
    // onConflictDoNothing sobre payloadHash → re-subir la MISMA cartola no duplica.
    const inserted = await db
      .insert(pendingExpense)
      .values(toInsert)
      .onConflictDoNothing({ target: pendingExpense.payloadHash })
      .returning({ id: pendingExpense.id });
    imported = inserted.length;
  }

  const duplicates = gastos.length - imported;

  if (imported > 0) {
    updateTag(hhTag(household.id, "pending"));
    revalidatePath("/gastos-pendientes");
  }

  return { imported, duplicates, nonExpenses };
}
