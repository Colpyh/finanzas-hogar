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

/**
 * getUser pero devolviendo null sin sesión, en vez de lanzar.
 * Solo captura UnauthorizedError: un error real de infraestructura DEBE
 * propagar al error boundary — capturarlo haría que las páginas muestren
 * datos de ejemplo (falsos) a un usuario logueado.
 */
export async function getSessionUser() {
  try {
    return await getUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return null;
    throw err;
  }
}
