"use server";

import { db } from "@/shared/lib/db";
import { income } from "@/shared/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { hhTag } from "@/shared/lib/cache-tags";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { addIncomeSchema } from "./types";

export async function addIncome(rawData: unknown): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "No tienes un hogar activo" };

    const data = addIncomeSchema.parse(rawData);

    // Salary is recurring: delete ALL existing salary rows for this member
    // so there's always exactly one active salary per member (the new one).
    if (data.type === "salary") {
      await db
        .delete(income)
        .where(
          and(
            eq(income.householdId, household.id),
            eq(income.memberId, user.id),
            eq(income.type, "salary")
          )
        );
    }

    await db.insert(income).values({
      householdId: household.id,
      memberId: user.id,
      type: data.type,
      description: data.description,
      amount: data.amount,
      currency: "CLP",
      periodMonth: data.periodMonth,
    });

    updateTag(hhTag(household.id, "income"));
    revalidatePath("/ingresos");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "No tienes un hogar activo" };

    const [row] = await db
      .select({ memberId: income.memberId })
      .from(income)
      .where(and(eq(income.id, id), eq(income.householdId, household.id)))
      .limit(1);

    if (!row) return { error: "Ingreso no encontrado" };
    if (row.memberId !== user.id) return { error: "No tienes permiso para eliminar este ingreso" };

    await db.delete(income).where(eq(income.id, id));

    updateTag(hhTag(household.id, "income"));
    revalidatePath("/ingresos");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al eliminar" };
  }
}
