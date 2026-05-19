"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import {
  createFixedExpenseSchema,
  markPaidSchema,
  updateFixedExpenseSchema,
} from "./types";

export async function createFixedExpense(rawData: unknown) {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const data = createFixedExpenseSchema.parse(rawData);

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

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
}

export async function markFixedExpensePaid(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  let data: ReturnType<typeof markPaidSchema.parse>;
  try {
    data = markPaidSchema.parse(rawData);
  } catch {
    return { error: "Datos de pago inválidos" };
  }
  const periodMonth = data.periodMonth ?? currentPeriodMonth();

  // Verify expense belongs to this household
  const [exp] = await db
    .select({ id: expense.id })
    .from(expense)
    .where(and(eq(expense.id, data.expenseId), eq(expense.householdId, household.id)))
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

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  return {};
}

export async function upgradeToPaid(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const periodMonth = month ?? currentPeriodMonth();

  try {
    await db
      .update(fixedExpensePayment)
      .set({ status: "paid", paidAt: new Date() })
      .where(
        and(
          eq(fixedExpensePayment.expenseId, expenseId),
          eq(fixedExpensePayment.householdId, household.id),
          eq(fixedExpensePayment.periodMonth, periodMonth),
          eq(fixedExpensePayment.paidBy, user.id)
        )
      );
  } catch {
    return { error: "No se pudo actualizar el pago" };
  }

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  return {};
}

export async function toggleFixedExpenseActive(expenseId: string): Promise<void> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const [current] = await db
    .select({ isActive: expense.isActive })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!current) throw new Error("Expense not found");

  await db
    .update(expense)
    .set({ isActive: !current.isActive })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)));

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
}

export async function updateFixedExpense(expenseId: string, rawData: unknown) {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const data = updateFixedExpenseSchema.parse(rawData);

  const [updated] = await db
    .update(expense)
    .set(data)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .returning();

  revalidatePath("/gastos-fijos");
  return updated;
}

export async function markPaidForOther(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const members = await getHouseholdMembers(household.id);
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

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  return {};
}

export async function unmarkOtherPayment(expenseId: string, month?: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const members = await getHouseholdMembers(household.id);
  const otherMember = members.find((m) => m.userId !== user.id);
  if (!otherMember) return { error: "No hay otro miembro en el hogar" };

  const periodMonth = month ?? currentPeriodMonth();

  await db
    .delete(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.householdId, household.id),
        eq(fixedExpensePayment.periodMonth, periodMonth),
        eq(fixedExpensePayment.paidBy, otherMember.userId)
      )
    );

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteFixedExpense(expenseId: string): Promise<void> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  await db
    .update(expense)
    .set({ deletedAt: new Date() })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)));

  revalidatePath("/gastos-fijos");
  revalidatePath("/dashboard");
}
