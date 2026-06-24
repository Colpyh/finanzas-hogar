import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/shared/lib/db";

// Keep-warm endpoint. An external cron (UptimeRobot / cron-job.org) pings this
// every few minutes so the serverless function and the DB connection stay warm,
// avoiding cold starts on the user's first navigation.
//
// force-dynamic ensures it actually executes every request (a cached response
// would keep nothing warm). It runs a trivial query to also wake the DB pool.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
