"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";

export async function settleBalanceItem(
  expenseId: string,
  periodMonth: string
): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) throw new Error("No household");

  // ¿Ya pagué este mes? Si sí, soy el acreedor → registro al otro.
  // Si no, soy el deudor → registro mi propio pago.
  const [myPayment] = await db
    .select({ id: fixedExpensePayment.id })
    .from(fixedExpensePayment)
    .where(
      and(
        eq(fixedExpensePayment.expenseId, expenseId),
        eq(fixedExpensePayment.periodMonth, periodMonth),
        eq(fixedExpensePayment.paidBy, user.id)
      )
    )
    .limit(1);

  const members = await getHouseholdMembers(household.id);
  const otherMember = members.find((m) => m.userId !== user.id);
  if (!otherMember) return { error: "No hay otro miembro en el hogar" };

  const [exp] = await db
    .select()
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);
  if (!exp) return { error: "Gasto no encontrado" };

  const monthlyAmount =
    exp.type === "installment"
      ? parseFloat(exp.installmentAmount ?? "0")
      : parseFloat(exp.amount ?? "0");
  const shareAmount = (monthlyAmount / members.length).toFixed(2);

  // Si ya pagué → el que falta es el otro. Si no pagué → el que falta soy yo.
  const targetId = myPayment ? otherMember.userId : user.id;

  try {
    await db.insert(fixedExpensePayment).values({
      expenseId,
      householdId: household.id,
      paidBy: targetId,
      periodMonth,
      amount: shareAmount,
      status: "paid",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "Este ítem ya está saldado" };
    }
    throw err;
  }

  updateTag(household.id);
  revalidatePath("/balances");
  revalidatePath("/gastos-fijos");
  revalidatePath("/compras");
  revalidatePath("/dashboard");
  return {};
}
