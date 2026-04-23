import { db } from "@/shared/lib/db";
import { bugReport } from "@/shared/lib/db/schema";
import { desc } from "drizzle-orm";

export async function getAllBugReports() {
  return db
    .select()
    .from(bugReport)
    .orderBy(desc(bugReport.createdAt));
}
