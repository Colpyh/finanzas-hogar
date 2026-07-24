"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getUser } from "@/auth/queries";
import { getHouseholdMembers, getUserHousehold } from "@/household/queries";
import { pendingDebtGuard } from "@/balances/guards";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import {
  createFixedExpenseSchema,
  markPaidSchema,
  updateFixedExpenseSchema,
} from "./types";

export async function createFixedExpense(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  let data: ReturnType<typeof createFixedExpenseSchema.parse>;
  try {
    data = createFixedExpenseSchema.parse(rawData);
  } catch {
    return { error: "Datos del gasto inválidos" };
  }

  await db
    .insert(expense)
    .values({
      ...data,
      type: data.expenseType ?? "fixed",
      householdId: household.id,
      createdBy: user.id,
      isActive: true,
      isShared: data.isShared,
      isPrivate: data.isPrivate ?? false,
      responsibleId: data.responsibleId ?? null,
      cardId: data.cardId ?? null,
    })
    .returning();

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function markFixedExpensePaid(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  let data: ReturnType<typeof markPaidSchema.parse>;
  try {
    data = markPaidSchema.parse(rawData);
  } catch {
    return { error: "Datos de pago inválidos" };
  }
  const periodMonth = data.periodMonth ?? currentPeriodMonth();

  // Verify expense belongs to this household (y no está borrado — un pago
  // sobre un gasto soft-borrado quedaría como fila fantasma).
  const [exp] = await db
    .select({ id: expense.id })
    .from(expense)
    .where(
      and(
        eq(expense.id, data.expenseId),
        eq(expense.householdId, household.id),
        isNull(expense.deletedAt)
      )
    )
    .limit(1);
  if (!exp) return { error: "Gasto no encontrado" };

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId: data.expenseId,
      householdId: household.id,
      paidBy: user.id,
      periodMonth,
      amount: data.amount,
      status: data.status,
      notes: data.notes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "Ya confirmaste tu pago este mes" };
    }
    throw err;
  }

  updateTag(hhTag(household.id, "payments"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function upgradeToPaid(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const periodMonth = month ?? currentPeriodMonth();

  let updated: { id: string }[];
  try {
    updated = await db
      .update(fixedExpensePayment)
      .set({ status: "paid", paidAt: new Date() })
      .where(
        and(
          eq(fixedExpensePayment.expenseId, expenseId),
          eq(fixedExpensePayment.householdId, household.id),
          eq(fixedExpensePayment.periodMonth, periodMonth),
          eq(fixedExpensePayment.paidBy, user.id)
        )
      )
      .returning({ id: fixedExpensePayment.id });
  } catch {
    return { error: "No se pudo actualizar el pago" };
  }

  if (updated.length === 0) {
    return { error: "No se encontró el pago para confirmar" };
  }

  updateTag(hhTag(household.id, "payments"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function toggleFixedExpenseActive(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [current] = await db
    .select({ isActive: expense.isActive })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!current) return { error: "Gasto no encontrado" };

  const result = await db
    .update(expense)
    .set({ isActive: !current.isActive })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .returning({ id: expense.id });

  if (result.length === 0) return { error: "Gasto no encontrado" };

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function updateFixedExpense(expenseId: string, rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  let data: ReturnType<typeof updateFixedExpenseSchema.parse>;
  try {
    data = updateFixedExpenseSchema.parse(rawData);
  } catch {
    return { error: "Datos del gasto inválidos" };
  }

  // Mismo guard que el borrado: desmarcar "compartido" saca el gasto de
  // getHouseholdDebtItems y una deuda sin saldar desaparecería en silencio.
  if (data.isShared === false) {
    const [current] = await db
      .select({ isShared: expense.isShared })
      .from(expense)
      .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
      .limit(1);
    if (current?.isShared) {
      const debtError = await pendingDebtGuard(household.id, user.id, expenseId);
      if (debtError) return { error: debtError };
    }
  }

  const [updated] = await db
    .update(expense)
    .set(data)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .returning({ id: expense.id });

  if (!updated) return { error: "Gasto no encontrado" };

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function markPaidForOther(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const members = await getHouseholdMembers(household.id);
  // Atajo pensado para 2 miembros: con 3+ hay varios "otros" y no se puede
  // inferir cuál pagó → saldar por-deudor se hace en Balances.
  if (members.length > 2) {
    return { error: "Con más de 2 miembros, saldá cada parte desde Balances" };
  }
  const otherMember = members.find((m) => m.userId !== user.id);
  if (!otherMember) return { error: "No hay otro miembro en el hogar" };

  const periodMonth = month ?? currentPeriodMonth();
  const [exp] = await db
    .select()
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);
  if (!exp) return { error: "Gasto no encontrado" };

  const monthlyAmount = exp.type === "installment"
    ? parseFloat(exp.installmentAmount ?? "0")
    : parseFloat(exp.amount ?? "0");
  const shareAmount = (monthlyAmount / members.length).toFixed(2);
  const markerName = user.email ?? "otro miembro";

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId,
      householdId: household.id,
      paidBy: otherMember.userId,
      periodMonth,
      amount: shareAmount,
      status: "paid",
      notes: `Marcado por ${markerName}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "El otro miembro ya tiene un pago registrado este mes" };
    }
    throw err;
  }

  updateTag(hhTag(household.id, "payments"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function unmarkMyPayment(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const periodMonth = month ?? currentPeriodMonth();

  const deleted = await db
    .delete(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.householdId, household.id),
        eq(fixedExpensePayment.periodMonth, periodMonth),
        eq(fixedExpensePayment.paidBy, user.id)
      )
    )
    .returning({ id: fixedExpensePayment.id });

  if (deleted.length === 0) return { error: "No se encontró el pago" };

  updateTag(hhTag(household.id, "payments"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function unmarkOtherPayment(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const members = await getHouseholdMembers(household.id);
  if (members.length > 2) {
    return { error: "Con más de 2 miembros, gestioná los pagos desde Balances" };
  }
  const otherMember = members.find((m) => m.userId !== user.id);
  if (!otherMember) return { error: "No hay otro miembro en el hogar" };

  const periodMonth = month ?? currentPeriodMonth();

  const deleted = await db
    .delete(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.householdId, household.id),
        eq(fixedExpensePayment.periodMonth, periodMonth),
        eq(fixedExpensePayment.paidBy, otherMember.userId)
      )
    )
    .returning({ id: fixedExpensePayment.id });

  if (deleted.length === 0) return { error: "No se encontró el pago" };

  updateTag(hhTag(household.id, "payments"));
  revalidatePath("/gastos-fijos");
  return {};
}

export async function deleteFixedExpense(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  // Guard: no soft-borrar un gasto compartido con meses sin saldar (la deuda
  // desaparecería del balance en silencio).
  const debtError = await pendingDebtGuard(household.id, user.id, expenseId);
  if (debtError) return { error: debtError };

  const result = await db
    .update(expense)
    .set({ deletedAt: new Date() })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .returning({ id: expense.id });

  if (result.length === 0) return { error: "Gasto no encontrado" };

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/gastos-fijos");
  return {};
}
