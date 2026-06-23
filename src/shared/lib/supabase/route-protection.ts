export type RouteProtection =
  | { action: "allow" }
  | { action: "redirect"; destination: string };

const PUBLIC_PREFIXES = ["/auth/", "/invite/"];
const ONBOARDING_PATH = "/onboarding";

const APP_ROUTES = [
  "/dashboard",
  "/gastos-fijos",
  "/compras",
  "/gastos",
  "/resumen",
  "/ajustes",
  "/ingresos",
  "/gastos-pendientes",
  "/balances",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Pure function — determines the route protection action for a given request.
 *
 * 3-state matrix:
 *   - No session → redirect to /auth/login (protected routes)
 *   - Session + no household → redirect to /onboarding (app routes)
 *   - Session + household → allow all; redirect away from /onboarding
 */
export function getRouteProtection(
  pathname: string,
  hasSession: boolean,
  hasHousehold: boolean
): RouteProtection {
  // Public routes are always accessible
  if (isPublic(pathname)) {
    return { action: "allow" };
  }

  // /onboarding — special 3-state handling
  if (pathname === ONBOARDING_PATH || pathname.startsWith(ONBOARDING_PATH)) {
    if (!hasSession) {
      return { action: "redirect", destination: "/auth/login" };
    }
    if (hasHousehold) {
      return { action: "redirect", destination: "/dashboard" };
    }
    return { action: "allow" };
  }

  // App routes require session
  if (isAppRoute(pathname)) {
    if (!hasSession) {
      return { action: "redirect", destination: "/auth/login" };
    }
    if (!hasHousehold) {
      return { action: "redirect", destination: "/onboarding" };
    }
    return { action: "allow" };
  }

  // Unknown routes — allow (Next.js handles 404)
  return { action: "allow" };
}
