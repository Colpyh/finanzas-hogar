"use server";

import { db } from "@/shared/lib/db";
import { bugReport } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/auth/queries";
import { z } from "zod";

const submitSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(100),
  description: z.string().min(1, "La descripción es requerida").max(1000),
});

export async function submitBugReport(rawData: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  const data = submitSchema.safeParse(rawData);
  if (!data.success) return { error: data.error.issues[0]?.message ?? "Datos inválidos" };

  await db.insert(bugReport).values({
    userId: user.id,
    userEmail: user.email ?? "sin correo",
    title: data.data.title,
    description: data.data.description,
  });

  return {};
}

export async function updateBugReportStatus(
  id: string,
  status: "open" | "resolved"
): Promise<{ error?: string }> {
  const user = await getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return { error: "Sin permisos" };

  await db.update(bugReport).set({ status }).where(eq(bugReport.id, id));
  return {};
}
