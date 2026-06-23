"use server";

import { z } from "zod";
import { db } from "@/shared/lib/db";
import { category, expense } from "@/shared/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  monthlyBudget: z.number().finite().positive().optional().nullable(),
});

type CategoryInput = z.input<typeof categorySchema>;

export async function createCategory(rawData: CategoryInput): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    const household = await getUserHousehold(user.id);
    if (!household) return { error: "No tienes un hogar activo" };

    const parsed = categorySchema.safeParse(rawData);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const data = parsed.data;

    await db.insert(category).values({
      householdId: household.id,
      name: data.name.trim(),
      icon: data.icon?.trim() || null,
      color: data.color ?? null,
      monthlyBudget: data.monthlyBudget != null ? String(data.monthlyBudget) : null,
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

    const parsed = categorySchema.safeParse(rawData);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const data = parsed.data;

    await db
      .update(category)
      .set({
        name: data.name.trim(),
        icon: data.icon?.trim() || null,
        color: data.color ?? null,
        monthlyBudget: data.monthlyBudget != null ? String(data.monthlyBudget) : null,
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
