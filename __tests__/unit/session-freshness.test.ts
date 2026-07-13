import { sessionFreshFromCookieValue } from "@/shared/lib/supabase/session-freshness";

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function cookieFor(expiresAt: number): string {
  return "base64-" + b64url(JSON.stringify({ access_token: "tok", expires_at: expiresAt }));
}

const NOW = 1_800_000_000; // fijo, en segundos

describe("sessionFreshFromCookieValue", () => {
  it("true cuando el token expira lejos del margen", () => {
    expect(sessionFreshFromCookieValue(cookieFor(NOW + 3600), NOW)).toBe(true);
  });

  it("false cuando expira dentro del margen de 60s (hay que refrescar)", () => {
    expect(sessionFreshFromCookieValue(cookieFor(NOW + 30), NOW)).toBe(false);
  });

  it("false cuando ya expiró", () => {
    expect(sessionFreshFromCookieValue(cookieFor(NOW - 10), NOW)).toBe(false);
  });

  it("false sin cookie", () => {
    expect(sessionFreshFromCookieValue("", NOW)).toBe(false);
  });

  it("false con contenido corrupto (nunca lanza)", () => {
    expect(sessionFreshFromCookieValue("base64-!!!no-es-b64!!!", NOW)).toBe(false);
    expect(sessionFreshFromCookieValue("cualquier cosa", NOW)).toBe(false);
  });

  it("soporta el formato legacy JSON url-encoded", () => {
    const legacy = encodeURIComponent(JSON.stringify({ access_token: "tok", expires_at: NOW + 3600 }));
    expect(sessionFreshFromCookieValue(legacy, NOW)).toBe(true);
  });

  it("false si el JSON no trae expires_at", () => {
    const sinExp = "base64-" + b64url(JSON.stringify({ access_token: "tok" }));
    expect(sessionFreshFromCookieValue(sinExp, NOW)).toBe(false);
  });
});
