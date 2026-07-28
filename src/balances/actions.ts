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
  const shareAmount = splitShareForDb(monthlyAmount, members.length);

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
