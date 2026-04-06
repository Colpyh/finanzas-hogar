type InviteState = {
  expiresAt: string;
  redeemedAt: string | null;
  memberCount: number;
};

type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Pure function — validates whether an invite can be redeemed.
 * Covers Scenarios 1.7–1.10.
 */
export function validateInviteRedemption(invite: InviteState): ValidationResult {
  if (new Date(invite.expiresAt) <= new Date()) {
    return { ok: false, error: "Este enlace de invitación ha expirado" };
  }

  if (invite.redeemedAt !== null) {
    return { ok: false, error: "Este enlace ya fue utilizado" };
  }

  if (invite.memberCount >= 2) {
    return { ok: false, error: "Este hogar ya está completo" };
  }

  return { ok: true };
}
