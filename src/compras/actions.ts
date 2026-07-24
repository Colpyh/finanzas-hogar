"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment, card } from "@/shared/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getUser } from "@/auth/queries";
import { getHouseholdMembers, getUserHousehold } from "@/household/queries";
import { pendingDebtGuard } from "@/balances/guards";
import { syncSharedInstallmentCounter } from "./installment-sync";
import { currentPeriodMonth, monthFromDate } from "@/shared/lib/db/helpers";
import { createPurchaseSchema, createInstallmentSchema, updateExpenseSchema, updateInstallmentSchema } from "./types";

export async function createPurchase(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  let data: ReturnType<typeof createPurchaseSchema.parse>;
  try {
    data = createPurchaseSchema.parse(rawData);
  } catch {
    return { error: "Datos de la compra inválidos" };
  }

  // Miembros ANTES de abrir la transacción: el pool serverless tiene max:1
  // conexión — una query fuera de `tx` mientras la transacción tiene la única
  // conexión abierta se colgaría esperando una conexión que nunca se libera.
  const members = data.isShared ? await getHouseholdMembers(household.id) : null;

  // Atómico: si falla el insert del pago semilla, el gasto compartido no debe
  // quedar creado sin su deuda registrada (quedaría invisible en Balances).
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(expense)
      .values({
        ...data,
        type: "one_time",
        householdId: household.id,
        createdBy: user.id,
        responsibleId: data.responsibleId ?? null,
        cardId: data.cardId ?? null,
        isPrivate: data.isPrivate ?? false,
        isShared: data.isShared ?? false,
      })
      .returning();

    // Compra puntual compartida: no es recurrente (a diferencia de cuotas/fijos),
    // así que registramos de una el pago de quien la pagó físicamente
    // (responsable, o quien la cargó si no hay responsable) — el resto del
    // hogar aparece con su parte pendiente en Balances desde el primer momento.
    if (data.isShared && created && members) {
      const payerId = data.responsibleId ?? user.id;
      const shareAmount = (parseFloat(data.amount) / members.length).toFixed(2);

      await tx.insert(fixedExpensePayment).values({
        expenseId: created.id,
        householdId: household.id,
        paidBy: payerId,
        periodMonth: monthFromDate(data.expenseDate),
        amount: shareAmount,
        status: "paid",
      });
    }
  });

  if (data.isShared) {
    updateTag(hhTag(household.id, "payments"));
    revalidatePath("/balances");
  }
  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

export async function createInstallment(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  let data: ReturnType<typeof createInstallmentSchema.parse>;
  try {
    data = createInstallmentSchema.parse(rawData);
  } catch {
    return { error: "Datos de la cuota inválidos" };
  }

  await db
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
      responsibleId: data.responsibleId ?? null,
      cardId: data.cardId ?? null,
      isPrivate: data.isPrivate ?? false,
      isShared: data.isShared ?? false,
    })
    .returning();

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

export async function markInstallmentPaid(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  // Incremento atómico en un solo UPDATE condicionado: el read-modify-write
  // en JS perdía incrementos con dos clicks concurrentes (ambos leían N y
  // escribían N+1), y el guard previo era check-then-act con la misma race.
  const updated = await db
    .update(expense)
    .set({ installmentsPaid: sql`coalesce(${expense.installmentsPaid}, 0) + 1` })
    .where(
      and(
        eq(expense.id, expenseId),
        eq(expense.householdId, household.id),
        isNull(expense.deletedAt),
        sql`coalesce(${expense.installmentsPaid}, 0) < coalesce(${expense.installmentsTotal}, 0)`
      )
    )
    .returning({ paid: expense.installmentsPaid });

  if (updated.length === 0) {
    const [current] = await db
      .select({ paid: expense.installmentsPaid, total: expense.installmentsTotal })
      .from(expense)
      .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
      .limit(1);
    if (!current) return { error: "Gasto no encontrado" };
    return { error: "Todas las cuotas ya fueron pagadas" };
  }

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

/** Solo registra el pago mensual en balance, sin tocar el contador de cuotas. */
export async function markAsMonthlyPayer(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [current] = await db
    .select({
      installmentAmount: expense.installmentAmount,
      isShared: expense.isShared,
    })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!current?.isShared) return { error: "Gasto no encontrado o no compartido" };

  const members = await getHouseholdMembers(household.id);
  const shareAmount = (parseFloat(current.installmentAmount ?? "0") / members.length).toFixed(2);
  const periodMonth = currentPeriodMonth();

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId,
      householdId: household.id,
      paidBy: user.id,
      periodMonth,
      amount: shareAmount,
      status: "paid",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "Ya registraste tu pago este mes" };
    }
    throw err;
  }

  // Si con este pago el mes quedó completo, cierra la cuota del período.
  await syncSharedInstallmentCounter(expenseId, household.id, periodMonth, members.length);

  updateTag(hhTag(household.id, "payments"));
  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

/** Registra la parte del deudor sin incrementar el contador de cuotas. */
export async function registerInstallmentShare(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [current] = await db
    .select({
      installmentAmount: expense.installmentAmount,
      isShared: expense.isShared,
    })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!current?.isShared) return { error: "Gasto no encontrado o no compartido" };

  const members = await getHouseholdMembers(household.id);
  const shareAmount = (parseFloat(current.installmentAmount ?? "0") / members.length).toFixed(2);
  const periodMonth = currentPeriodMonth();

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId,
      householdId: household.id,
      paidBy: user.id,
      periodMonth,
      amount: shareAmount,
      status: "paid",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "Ya registraste tu parte este mes" };
    }
    throw err;
  }

  // Si con esta parte el mes quedó completo, cierra la cuota del período.
  await syncSharedInstallmentCounter(expenseId, household.id, periodMonth, members.length);

  updateTag(hhTag(household.id, "payments"));
  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

export async function updateExpense(expenseId: string, rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  let data: ReturnType<typeof updateExpenseSchema.parse>;
  try {
    data = updateExpenseSchema.parse(rawData);
  } catch {
    return { error: "Datos del gasto inválidos" };
  }

  const [updated] = await db
    .update(expense)
    .set(data)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .returning({ id: expense.id });

  if (!updated) return { error: "Gasto no encontrado" };

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  revalidatePath(`/gastos/${expenseId}`);
  return {};
}

export async function updateInstallment(
  expenseId: string,
  rawData: unknown,
): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [current] = await db
    .select({ installmentsTotal: expense.installmentsTotal, isShared: expense.isShared })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!current) return { error: "Gasto no encontrado" };

  const data = updateInstallmentSchema.parse(rawData);

  if (data.installmentsPaid > (current.installmentsTotal ?? 0)) {
    return { error: "Las cuotas pagadas no pueden superar el total" };
  }

  // Desmarcar "compartido" saca el gasto de getHouseholdDebtItems (filtra
  // isShared=true) — sin este guard, una deuda sin saldar desaparecería del
  // balance en silencio, igual que borrar sin pendingDebtGuard.
  if (data.isShared === false && current.isShared) {
    const debtError = await pendingDebtGuard(household.id, user.id, expenseId);
    if (debtError) return { error: debtError };
  }

  await db
    .update(expense)
    .set({
      description: data.description,
      installmentsPaid: data.installmentsPaid,
      ...(data.isShared !== undefined ? { isShared: data.isShared } : {}),
    })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)));

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

export async function updateExpenseCard(
  expenseId: string,
  cardId: string | null,
): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [row] = await db
    .select({ id: expense.id })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!row) return { error: "Gasto no encontrado" };

  await db.update(expense).set({ cardId }).where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)));

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  revalidatePath(`/gastos/${expenseId}`);
  return {};
}

/** Marca/desmarca una compra puntual (one_time) como pagada. Toggle de paid_at. */
export async function toggleExpensePaid(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [exp] = await db
    .select({ paidAt: expense.paidAt, type: expense.type, cardId: expense.cardId, cardKind: card.kind })
    .from(expense)
    .leftJoin(card, eq(expense.cardId, card.id))
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id), isNull(expense.deletedAt)))
    .limit(1);
  if (!exp) return { error: "Compra no encontrada" };
  if (exp.type !== "one_time") return { error: "Solo las compras puntuales tienen estado de pago" };
  if (!exp.cardId) return { error: "Las compras sin tarjeta ya cuentan como pagadas" };
  if (exp.cardKind === "debit") return { error: "Las compras con débito ya están pagadas" };

  const result = await db
    .update(expense)
    .set({ paidAt: exp.paidAt ? null : new Date() })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .returning({ id: expense.id });
  if (result.length === 0) return { error: "No se pudo actualizar la compra" };

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}

export async function deleteExpense(expenseId: string): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  const [row] = await db
    .select({ createdBy: expense.createdBy })
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);

  if (!row) return { error: "Gasto no encontrado" };
  if (row.createdBy !== user.id) return { error: "No tienes permiso para eliminar este gasto" };

  // Guard: el balance solo considera gastos no borrados — soft-borrar un gasto
  // compartido con meses sin saldar haría desaparecer esa deuda en silencio.
  const debtError = await pendingDebtGuard(household.id, user.id, expenseId);
  if (debtError) return { error: debtError };

  await db
    .update(expense)
    .set({ deletedAt: new Date() })
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)));

  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/compras");
  return {};
}
