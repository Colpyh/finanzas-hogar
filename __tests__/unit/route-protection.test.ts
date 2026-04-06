import { getRouteProtection, type RouteProtection } from "@/shared/lib/supabase/route-protection";

// ============================================================
// getRouteProtection()
// Pure function — maps (pathname, hasSession, hasHousehold) → redirect decision
// Covers the 3-state matrix from design §8
// ============================================================

describe("getRouteProtection", () => {
  // PUBLIC routes — always accessible
  describe("public routes", () => {
    it("allows unauthenticated access to /auth/login", () => {
      const result = getRouteProtection("/auth/login", false, false);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });

    it("allows unauthenticated access to /auth/callback", () => {
      const result = getRouteProtection("/auth/callback", false, false);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });

    it("allows unauthenticated access to /invite/some-token", () => {
      const result = getRouteProtection("/invite/abc123", false, false);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });
  });

  // PROTECTED routes — no session → redirect to /auth/login
  describe("protected routes — no session", () => {
    it("redirects unauthenticated user from /dashboard to /auth/login", () => {
      const result = getRouteProtection("/dashboard", false, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/auth/login",
      });
    });

    it("redirects unauthenticated user from /gastos-fijos to /auth/login", () => {
      const result = getRouteProtection("/gastos-fijos", false, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/auth/login",
      });
    });

    it("redirects unauthenticated user from /compras to /auth/login", () => {
      const result = getRouteProtection("/compras", false, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/auth/login",
      });
    });

    it("redirects unauthenticated user from /resumen to /auth/login", () => {
      const result = getRouteProtection("/resumen", false, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/auth/login",
      });
    });

    it("redirects unauthenticated user from /ajustes to /auth/login", () => {
      const result = getRouteProtection("/ajustes", false, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/auth/login",
      });
    });

    it("redirects unauthenticated user from /onboarding to /auth/login", () => {
      const result = getRouteProtection("/onboarding", false, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/auth/login",
      });
    });
  });

  // PROTECTED routes — session but no household → redirect to /onboarding
  describe("protected app routes — session without household", () => {
    it("redirects authenticated user without household from /dashboard to /onboarding", () => {
      const result = getRouteProtection("/dashboard", true, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/onboarding",
      });
    });

    it("redirects authenticated user without household from /compras to /onboarding", () => {
      const result = getRouteProtection("/compras", true, false);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/onboarding",
      });
    });
  });

  // ONBOARDING — has session + household → redirect to /dashboard
  describe("onboarding route — session with household", () => {
    it("redirects authenticated user with household from /onboarding to /dashboard", () => {
      const result = getRouteProtection("/onboarding", true, true);
      expect(result).toEqual<RouteProtection>({
        action: "redirect",
        destination: "/dashboard",
      });
    });

    it("allows authenticated user without household to stay on /onboarding", () => {
      const result = getRouteProtection("/onboarding", true, false);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });
  });

  // FULLY AUTHENTICATED — session + household → allow all app routes
  describe("fully authenticated user", () => {
    it("allows access to /dashboard when session and household exist", () => {
      const result = getRouteProtection("/dashboard", true, true);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });

    it("allows access to /gastos-fijos when session and household exist", () => {
      const result = getRouteProtection("/gastos-fijos", true, true);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });

    it("allows access to /ajustes when session and household exist", () => {
      const result = getRouteProtection("/ajustes", true, true);
      expect(result).toEqual<RouteProtection>({ action: "allow" });
    });
  });
});
