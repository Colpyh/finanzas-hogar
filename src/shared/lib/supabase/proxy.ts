import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { sessionFreshFromCookieValue } from "./session-freshness";

/** Junta las chunks de la cookie de sesión (sb-<ref>-auth-token[.N]). */
function sessionCookieValue(request: NextRequest): string {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://x.supabase.co")
    .hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  return request.cookies
    .getAll()
    .filter((c) => c.name === name || c.name.startsWith(`${name}.`))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
}

/**
 * Refreshes the Supabase session cookie in Next.js 16 proxy (formerly middleware).
 * Call this from proxy.ts to keep sessions alive.
 *
 * Fast path (perf): si el access token de la cookie sigue vigente (>60s de
 * margen), no hay nada que refrescar y se saltea la llamada de red al Auth
 * server que antes se pagaba en CADA request. Esto NO autoriza nada — la
 * autorización real sigue siendo el getUser() de páginas y Server Actions.
 */
export async function updateSession(request: NextRequest) {
  if (sessionFreshFromCookieValue(sessionCookieValue(request))) {
    return { supabaseResponse: NextResponse.next({ request }), user: null };
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
