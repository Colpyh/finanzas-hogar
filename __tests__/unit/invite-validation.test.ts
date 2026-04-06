import { validateInviteRedemption } from "@/onboarding/invite-validation";

// ============================================================
// validateInviteRedemption()
// Pure function — validates invite state before redemption
// Covers Scenarios 1.7, 1.8, 1.9, 1.10
// ============================================================

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

describe("validateInviteRedemption", () => {
  it("returns ok for a valid unredeemed unexpired invite with room", () => {
    const result = validateInviteRedemption({
      expiresAt: FUTURE,
      redeemedAt: null,
      memberCount: 1,
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns expired error when expiresAt is in the past (Scenario 1.8)", () => {
    const result = validateInviteRedemption({
      expiresAt: PAST,
      redeemedAt: null,
      memberCount: 1,
    });
    expect(result).toEqual({
      ok: false,
      error: "Este enlace de invitación ha expirado",
    });
  });

  it("returns redeemed error when redeemedAt is set (Scenario 1.9)", () => {
    const result = validateInviteRedemption({
      expiresAt: FUTURE,
      redeemedAt: PAST,
      memberCount: 1,
    });
    expect(result).toEqual({
      ok: false,
      error: "Este enlace ya fue utilizado",
    });
  });

  it("returns full error when household already has 2 members (Scenario 1.10)", () => {
    const result = validateInviteRedemption({
      expiresAt: FUTURE,
      redeemedAt: null,
      memberCount: 2,
    });
    expect(result).toEqual({
      ok: false,
      error: "Este hogar ya está completo",
    });
  });

  it("checks expiry before redeemed status", () => {
    // Expired takes priority over already-redeemed
    const result = validateInviteRedemption({
      expiresAt: PAST,
      redeemedAt: PAST,
      memberCount: 1,
    });
    expect(result).toEqual({
      ok: false,
      error: "Este enlace de invitación ha expirado",
    });
  });
});
