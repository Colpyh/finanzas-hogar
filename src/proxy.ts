import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  try {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  } catch {
    // If session refresh fails, allow the request to continue
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
