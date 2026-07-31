"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getHouseholdMembers } from "@/household/queries";
import { requireHousehold } from "@/household/guards";
import { isUniqueViolation } from "@/shared/lib/db/helpers";
import { splitShareForDb } from "@/shared/lib/split-share";

/** Devuelve la parte por miembro de un ítem de deuda, o null si el gasto no
 * existe (o no pertenece al hogar). Comparte la lógica de montos entre
 * `settleBalanceItem` (uno) y `settleAllWithMember` (batch). */
async function computeShareAmount(
  householdId: string,
  expenseId: string,
  periodMonth: string,
  memberCount: number
): Promise<string | null> {
  const [exp] = await db
    .select()
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, householdId)))
    .limit(1);
  if (!exp) return null;

  let monthlyAmount: number;
  if (exp.type === "installment") {
    monthlyAmount = parseFloat(exp.installmentAmount ?? "0");
  } else if (exp.type === "variable") {
    // El monto real del variable ese mes vive en el pago ya registrado, no en exp.amount (=0).
    const [paid] = await db
      .select({ amount: fixedExpensePayment.amount })
      .from(fixedExpensePayment)
      .where(
        and(
          eq(fixedExpensePayment.expenseId, expenseId),
          eq(fixedExpensePayment.periodMonth, periodMonth),
          eq(fixedExpensePayment.status, "paid")
        )
      )
      .limit(1);
    monthlyAmount = parseFloat(paid?.amount ?? exp.amount ?? "0");
  } else {
    monthlyAmount = parseFloat(exp.amount ?? "0");
  }
  return splitShareForDb(monthlyAmount, memberCount);
}

export async function settleBalanceItem(
  expenseId: string,
  periodMonth: string,
  debtorId: string
): Promise<{ error?: string }> {
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { household } = auth;

  // Saldar un ítem = registrar que el DEUDOR de ese ítem pagó su parte. El
  // deudor lo pasa la UI explícitamente (con 3+ miembros hay varios "otros",
  // así que no se puede inferir). Sirve tanto si soy yo el deudor (registro mi
  // propio pago) como si soy el acreedor (registro el del otro): en ambos
  // casos la fila a insertar es paidBy = debtorId.
  const members = await getHouseholdMembers(household.id);
  const isMember = members.some((m) => m.userId === debtorId);
  if (!isMember) return { error: "El deudor no pertenece al hogar" };

  const shareAmount = await computeShareAmount(household.id, expenseId, periodMonth, members.length);
  if (shareAmount == null) return { error: "Gasto no encontrado" };

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId,
      householdId: household.id,
      paidBy: debtorId,
      periodMonth,
      amount: shareAmount,
      status: "paid",
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return { error: "Este ítem ya está saldado" };
    throw err;
  }

  updateTag(hhTag(household.id, "payments"));
  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/balances");
  return {};
}

export type SettleAllItem = { expenseId: string; periodMonth: string; debtorId: string };

/**
 * Salda TODOS los ítems pendientes con una contraparte de una sola vez
 * ("Saldar todo" en la card de neto por miembro). Los items pueden incluir
 * ambas direcciones (lo que me deben y lo que debo yo) — cada uno se inserta
 * con su propio `debtorId`. Atómico: si alguno ya fue saldado (carrera con
 * otro saldo simultáneo), la transacción entera se revierte y el usuario
 * reintenta con la vista ya refrescada, en vez de quedar en un estado
 * parcialmente saldado y confuso.
 */
export async function settleAllWithMember(items: SettleAllItem[]): Promise<{ error?: string }> {
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { household } = auth;

  if (items.length === 0) return {};

  const members = await getHouseholdMembers(household.id);
  const memberIds = new Set(members.map((m) => m.userId));
  if (items.some((i) => !memberIds.has(i.debtorId))) {
    return { error: "El deudor no pertenece al hogar" };
  }

  // Montos ANTES de abrir la transacción (mismo motivo que createPurchase:
  // pool serverless con pocas conexiones — secuencial para no saturarlo).
  const rows: (SettleAllItem & { shareAmount: string })[] = [];
  for (const item of items) {
    const shareAmount = await computeShareAmount(household.id, item.expenseId, item.periodMonth, members.length);
    if (shareAmount == null) return { error: "Alguno de los gastos ya no existe" };
    rows.push({ ...item, shareAmount });
  }

  try {
    await db.transaction(async (tx) => {
      for (const row of rows) {
        await tx.insert(fixedExpensePayment).values({
          expenseId: row.expenseId,
          householdId: household.id,
          paidBy: row.debtorId,
          periodMonth: row.periodMonth,
          amount: row.shareAmount,
          status: "paid",
        });
      }
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { error: "Alguno de los ítems ya estaba saldado — refrescá la página e intentá de nuevo." };
    }
    return { error: err instanceof Error ? err.message : "No se pudo saldar la cuenta" };
  }

  updateTag(hhTag(household.id, "payments"));
  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/balances");
  return {};
}
