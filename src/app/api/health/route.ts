import { NextResponse, connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/shared/lib/db";

// Keep-warm endpoint. An external cron (UptimeRobot / cron-job.org) pings this
// every few minutes so the serverless function and the DB connection stay warm,
// avoiding cold starts on the user's first navigation.
//
// `await connection()` opts out of prerendering (the Next 16 replacement for the
// now-incompatible `dynamic = "force-dynamic"` under cacheComponents), so this
// runs on every request. It runs a trivial query to also wake the DB pool.
export async function GET() {
  await connection();
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
