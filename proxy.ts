import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";
import { getRouteProtection } from "@/shared/lib/supabase/route-protection";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 proxy (formerly middleware).
 * - Refreshes the Supabase session cookie on every request
 * - Enforces the 3-state route protection matrix
 */
export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const hasSession = user !== null;

  // Determine if the user has a household (only check for authenticated users on protected routes)
  let hasHousehold = false;
  if (hasSession) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only in proxy context — session already updated above
          },
        },
      }
    );
    const { data: member } = await supabase
      .from("household_member")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    hasHousehold = member !== null;
  }

  const protection = getRouteProtection(pathname, hasSession, hasHousehold);

  if (protection.action === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = protection.destination;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
