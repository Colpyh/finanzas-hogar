import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { db } from "@/shared/lib/db";
import { householdMember } from "@/shared/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_code`);
  }

  // Check if user already belongs to a household
  const membership = await db
    .select({ id: householdMember.id })
    .from(householdMember)
    .where(eq(householdMember.userId, data.user.id))
    .limit(1);

  const destination = membership.length > 0 ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
