import { getUser } from "@/auth/queries";
import { getUserHousehold } from "./queries";

/**
 * Guard repetido en casi toda Server Action: usuario autenticado + su hogar
 * activo. Uso: `const auth = await requireHousehold(); if (!auth.ok) return
 * { error: auth.error }; const { user, household } = auth;`
 *
 * ok:boolean como discriminante (no `error` truthy) — con `error: string` el
 * narrowing de TS no descarta un string vacío falsy, así que `if (auth.error)`
 * no angosta el tipo de forma confiable.
 */
export async function requireHousehold(): Promise<
  | { ok: true; user: Awaited<ReturnType<typeof getUser>>; household: NonNullable<Awaited<ReturnType<typeof getUserHousehold>>> }
  | { ok: false; error: string }
> {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return { ok: false, error: "No tienes un hogar activo" };
  return { ok: true, user, household };
}
