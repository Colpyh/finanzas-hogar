/**
 * Decide si la cookie de sesión de Supabase sigue vigente SIN llamada de red.
 *
 * ⚠ Seguridad: acá NO se verifica la firma del JWT y este resultado NO
 * autoriza nada. Solo decide si el proxy puede saltearse el getUser() de
 * refresh (que costaba una llamada de red al Auth server en CADA request).
 * La autorización real sigue siendo el supabase.auth.getUser() de páginas
 * y Server Actions. Una cookie forjada solo logra... saltearse su propio
 * refresh, y rebota como 401 en el primer acceso a datos.
 *
 * Corre en el proxy (posible Edge runtime): sin Buffer, solo atob.
 */
const REFRESH_MARGIN_SECONDS = 60;

function b64urlDecode(value: string): string {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

export function sessionFreshFromCookieValue(
  cookieValue: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!cookieValue) return false;
  try {
    const json = cookieValue.startsWith("base64-")
      ? b64urlDecode(cookieValue.slice("base64-".length))
      : decodeURIComponent(cookieValue);
    const session = JSON.parse(json) as { expires_at?: number };
    if (typeof session.expires_at !== "number") return false;
    return session.expires_at - nowSeconds > REFRESH_MARGIN_SECONDS;
  } catch {
    return false;
  }
}
