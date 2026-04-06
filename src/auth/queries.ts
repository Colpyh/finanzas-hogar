import { createClient } from "@/shared/lib/supabase/server";
import { UnauthorizedError } from "./types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Returns the authenticated user or throws UnauthorizedError.
 * Use this in all Server Actions that require authentication.
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return user;
}
