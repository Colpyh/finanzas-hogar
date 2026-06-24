import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return "Usuario";
    const meta = data.user.user_metadata;
    return meta?.full_name ?? meta?.name ?? "Usuario";
  } catch {
    return "Usuario";
  }
}

/**
 * Resolves display names for many users with a SINGLE Admin API call instead of
 * one `getUserById` per user (avoids N+1 against Supabase Auth).
 * Returns a Map keyed by userId; missing users fall back to "Usuario".
 */
export async function getDisplayNamesByIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (userIds.length === 0) return result;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error || !data?.users) {
      for (const id of userIds) result.set(id, "Usuario");
      return result;
    }

    const wanted = new Set(userIds);
    for (const u of data.users) {
      if (!wanted.has(u.id)) continue;
      const meta = u.user_metadata;
      result.set(u.id, meta?.full_name ?? meta?.name ?? u.email ?? "Usuario");
    }
  } catch {
    // fall through to defaults below
  }

  for (const id of userIds) {
    if (!result.has(id)) result.set(id, "Usuario");
  }
  return result;
}
