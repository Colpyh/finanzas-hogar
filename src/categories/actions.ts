"use server";

import { db } from "@/shared/lib/db";
import { category, expense } from "@/shared/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";

type CategoryInput = { name: string; icon?: string; color?: string; monthlyBudget?: number };

export async function createCategory(rawData: CategoryInput): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "No tienes un hogar activo" };

    const name = rawData.name?.trim();
    if (!name) return { error: "El nombre es obligatorio" };

    await db.insert(category).values({
      householdId: household.id,
      name,
      icon: rawData.icon?.trim() || null,
      color: rawData.color?.trim() || null,
      monthlyBudget: rawData.monthlyBudget != null ? String(rawData.monthlyBudget) : null,
    });

    revalidatePath("/ajustes");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function updateCategory(
  id: string,
  rawData: CategoryInput
): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "Sin hogar activo" };

    const name = rawData.name?.trim();
    if (!name) return { error: "El nombre es obligatorio" };

    await db
      .update(category)
      .set({
        name,
        icon: rawData.icon?.trim() || null,
        color: rawData.color?.trim() || null,
        monthlyBudget: rawData.monthlyBudget != null ? String(rawData.monthlyBudget) : null,
      })
      .where(and(eq(category.id, id), eq(category.householdId, household.id)));

    revalidatePath("/ajustes");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "Sin hogar activo" };

    const usages = await db
      .select({ id: expense.id })
      .from(expense)
      .where(and(eq(expense.categoryId, id), isNull(expense.deletedAt)))
      .limit(1);

    if (usages.length > 0) {
      return { error: "Esta categoría está en uso y no puede eliminarse" };
    }

    await db
      .delete(category)
      .where(and(eq(category.id, id), eq(category.householdId, household.id)));

    revalidatePath("/ajustes");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al eliminar" };
  }
}
