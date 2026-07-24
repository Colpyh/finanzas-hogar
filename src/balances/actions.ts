"use server";

import { db } from "@/shared/lib/db";
import { expense, fixedExpensePayment } from "@/shared/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import { syncSharedInstallmentCounter } from "@/compras/installment-sync";

export async function settleBalanceItem(
  expenseId: string,
  periodMonth: string,
  debtorId: string
): Promise<{ error?: string }> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { error: "No tienes un hogar activo" };

  // Saldar un ítem = registrar que el DEUDOR de ese ítem pagó su parte. El
  // deudor lo pasa la UI explícitamente (con 3+ miembros hay varios "otros",
  // así que no se puede inferir). Sirve tanto si soy yo el deudor (registro mi
  // propio pago) como si soy el acreedor (registro el del otro): en ambos
  // casos la fila a insertar es paidBy = debtorId.
  const members = await getHouseholdMembers(household.id);
  const isMember = members.some((m) => m.userId === debtorId);
  if (!isMember) return { error: "El deudor no pertenece al hogar" };

  const [exp] = await db
    .select()
    .from(expense)
    .where(and(eq(expense.id, expenseId), eq(expense.householdId, household.id)))
    .limit(1);
  if (!exp) return { error: "Gasto no encontrado" };

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
  const shareAmount = (monthlyAmount / members.length).toFixed(2);

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
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("uq_expense_period_user") || msg.includes("unique")) {
      return { error: "Este ítem ya está saldado" };
    }
    throw err;
  }

  // Si al saldar quedó completo el mes de una cuota compartida, cierra el período.
  await syncSharedInstallmentCounter(expenseId, household.id, periodMonth, members.length);

  updateTag(hhTag(household.id, "payments"));
  updateTag(hhTag(household.id, "expenses"));
  revalidatePath("/balances");
  return {};
}
