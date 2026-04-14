"use server";

import { db } from "@/shared/lib/db";
import { expense } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { canMarkInstallmentPaid } from "./installment-utils";
import { createPurchaseSchema, createInstallmentSchema, updateExpenseSchema } from "./types";

export async function createPurchase(rawData: unknown) {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const data = createPurchaseSchema.parse(rawData);

  const [created] = await db
    .insert(expense)
    .values({
      ...data,
      type: "one_time",
      householdId: household.id,
      createdBy: user.id,
    })
    .returning();

  revalidatePath("/compras");
  revalidatePath("/dashboard");
  redirect("/compras");
}

export async function createInstallment(rawData: unknown) {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  const data = createInstallmentSchema.parse(rawData);

  const [created] = await db
    .insert(expense)
    .values({
      description: data.description,
      categoryId: data.categoryId,
      currency: data.currency,
      installmentsTotal: data.installmentsTotal,
      installmentAmount: data.installmentAmount,
      startMonth: data.startMonth,
      amount: data.amount,
      type: "installment",
      installmentsPaid: 0,
      householdId: household.id,
      createdBy: user.id,
    })
    .returning();

  revalidatePath("/compras");
  revalidatePath("/dashboard");
  redirect("/compras");
}

export async function markInstallmentPaid(expenseId: string): Promise<{ error?: string }> {
  await getUser();

  const [current] = await db
    .select({
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
    })
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!current) return { error: "Gasto no encontrado" };

  const paid = current.installmentsPaid ?? 0;
  const total = current.installmentsTotal ?? 0;

  // Scenario 3.6 — server-side guard
  if (!canMarkInstallmentPaid(paid, total)) {
    return { error: "Todas las cuotas ya fueron pagadas" };
  }

  await db
    .update(expense)
    .set({ installmentsPaid: paid + 1 })
    .where(eq(expense.id, expenseId));

  revalidatePath("/compras");
  revalidatePath("/dashboard");
  return {};
}

export async function updateExpense(expenseId: string, rawData: unknown) {
  await getUser();
  const data = updateExpenseSchema.parse(rawData);

  const [updated] = await db
    .update(expense)
    .set(data)
    .where(eq(expense.id, expenseId))
    .returning();

  revalidatePath("/compras");
  return updated;
}

export async function deleteExpense(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();

  // Scenario 3.11 — only creator can delete
  const [row] = await db
    .select({ createdBy: expense.createdBy })
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!row) return { error: "Gasto no encontrado" };
  if (row.createdBy !== user.id) return { error: "No tenés permiso para eliminar este gasto" };

  await db
    .update(expense)
    .set({ deletedAt: new Date() })
    .where(eq(expense.id, expenseId));

  revalidatePath("/compras");
  revalidatePath("/dashboard");
  return {};
}
