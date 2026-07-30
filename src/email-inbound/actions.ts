"use server";

import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { requireHousehold } from "@/household/guards";
import { db } from "@/shared/lib/db";
import { pendingExpense, expense, card, fixedExpensePayment } from "@/shared/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getHouseholdMembers } from "@/household/queries";
import { splitShareForDb } from "@/shared/lib/split-share";
import { monthFromDate } from "@/shared/lib/db/helpers";
import {
  confirmPendingExpenseSchema,
  discardPendingExpenseSchema,
  type ConfirmPendingExpenseInput,
  type DiscardPendingExpenseInput,
} from "./types";

export async function confirmPendingExpense(
  input: ConfirmPendingExpenseInput
): Promise<{ error?: string }> {
  let parsed: ReturnType<typeof confirmPendingExpenseSchema.parse>;
  try {
    parsed = confirmPendingExpenseSchema.parse(input);
  } catch {
    return { error: "Datos inválidos" };
  }
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { user, household } = auth;

  // Miembros ANTES de abrir la transacción (mismo motivo que createPurchase:
  // pool serverless con pocas conexiones, una query fuera de `tx` mientras la
  // transacción tiene la única conexión abierta se colgaría).
  const members = parsed.isShared ? await getHouseholdMembers(household.id) : null;

  // Los throw DENTRO de la transacción son el mecanismo de rollback de
  // Drizzle — se capturan afuera y se traducen a {error} para el caller.
  try {
    await db.transaction(async (tx) => {
      // Fetch pending with household + status guard. createdByUserId: solo
      // el dueño del pendiente puede confirmarlo — el resto del hogar ni
      // siquiera lo ve en la lista, pero esto cierra el mismo hueco por API.
      const [pending] = await tx
        .select()
        .from(pendingExpense)
        .where(
          and(
            eq(pendingExpense.id, parsed.pendingExpenseId),
            eq(pendingExpense.householdId, household.id),
            eq(pendingExpense.status, "pending"),
            eq(pendingExpense.createdByUserId, user.id)
          )
        )
        .limit(1);

      if (!pending) {
        throw new Error("Este gasto pendiente ya fue procesado o no existe");
      }

      // Auto-vincular la tarjeta por los últimos 4 dígitos del correo del banco,
      // solo si hay exactamente UNA tarjeta activa con ese last4 (sin ambigüedad).
      let matchedCardId: string | undefined;
      if (pending.parsedCardLast4) {
        const matches = await tx
          .select({ id: card.id })
          .from(card)
          .where(
            and(
              eq(card.householdId, household.id),
              eq(card.isActive, true),
              eq(card.lastFour, pending.parsedCardLast4)
            )
          )
          .limit(2);
        if (matches.length === 1) matchedCardId = matches[0]!.id;
      }

      // Create the expense
      const inserted = await tx
        .insert(expense)
        .values({
          householdId: household.id,
          createdBy: user.id,
          categoryId: parsed.categoryId,
          type: "one_time",
          description: parsed.description,
          amount: parsed.amount,
          currency: "CLP",
          expenseDate: parsed.expenseDate,
          notes: parsed.notes ?? null,
          isPrivate: parsed.isPrivate,
          isShared: parsed.isShared,
          ...(matchedCardId ? { cardId: matchedCardId } : {}),
        })
        .returning({ id: expense.id });

      const created = inserted[0];
      if (!created) throw new Error("No se pudo crear el gasto");

      // Compartido: registrar de una el pago de quien confirmó — el resto
      // del hogar aparece con su parte pendiente en Balances desde ya
      // (mismo patrón que createPurchase para compras compartidas).
      if (parsed.isShared && members) {
        const shareAmount = splitShareForDb(parsed.amount, members.length);
        await tx.insert(fixedExpensePayment).values({
          expenseId: created.id,
          householdId: household.id,
          paidBy: user.id,
          periodMonth: monthFromDate(parsed.expenseDate),
          amount: shareAmount,
          status: "paid",
        });
      }

      // Flip pending → confirmed
      await tx
        .update(pendingExpense)
        .set({ status: "confirmed", expenseId: created.id })
        .where(eq(pendingExpense.id, pending.id));
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo confirmar el gasto" };
  }

  if (parsed.isShared) {
    updateTag(hhTag(household.id, "payments"));
    revalidatePath("/balances");
  }
  updateTag(hhTag(household.id, "expenses"));
  updateTag(hhTag(household.id, "pending"));
  revalidatePath("/gastos-pendientes");
  return {};
}

export async function discardPendingExpense(
  input: DiscardPendingExpenseInput
): Promise<{ error?: string }> {
  let parsed: DiscardPendingExpenseInput;
  try {
    parsed = discardPendingExpenseSchema.parse(input);
  } catch {
    return { error: "Datos inválidos" };
  }
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { user, household } = auth;

  const result = await db
    .update(pendingExpense)
    .set({ status: "discarded" })
    .where(
      and(
        eq(pendingExpense.id, parsed.pendingExpenseId),
        eq(pendingExpense.householdId, household.id),
        eq(pendingExpense.status, "pending"),
        eq(pendingExpense.createdByUserId, user.id)
      )
    )
    .returning({ id: pendingExpense.id });

  if (result.length === 0) {
    return { error: "Este gasto pendiente ya fue procesado o no existe" };
  }

  updateTag(hhTag(household.id, "pending"));
  revalidatePath("/gastos-pendientes");
  return {};
}
