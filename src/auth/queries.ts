import { cache } from "react";
import { createClient } from "@/shared/lib/supabase/server";
import { UnauthorizedError } from "./types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// cache() deduplicates within a single render tree (layout + page share the result)
export const getUser = cache(async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return user;
});
