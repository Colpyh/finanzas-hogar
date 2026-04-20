import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES RLS.
 *
 * ⚠ IMPORTANT: This client MUST ONLY be imported from `src/app/api/webhooks/**`.
 *    Do not import it from Server Actions, pages, or any code that runs in a
 *    user-authenticated request. RLS is our primary defense; bypassing it
 *    anywhere else is a security bug.
 *
 * If you need elevated privileges in a user context, add a Postgres function
 * with SECURITY DEFINER instead of using this client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
