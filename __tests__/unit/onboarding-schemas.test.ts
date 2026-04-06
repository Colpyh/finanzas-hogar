import {
  createHouseholdSchema,
  redeemInviteSchema,
} from "@/onboarding/types";

// ============================================================
// createHouseholdSchema
// ============================================================
describe("createHouseholdSchema", () => {
  it("accepts a valid household name", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa Matías" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createHouseholdSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("name");
  });

  it("rejects a name longer than 50 characters", () => {
    const result = createHouseholdSchema.safeParse({
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a name exactly 50 characters long", () => {
    const result = createHouseholdSchema.safeParse({
      name: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// redeemInviteSchema
// ============================================================
describe("redeemInviteSchema", () => {
  it("accepts a valid 64-char hex token", () => {
    const token = "a".repeat(64);
    const result = redeemInviteSchema.safeParse({ token });
    expect(result.success).toBe(true);
  });

  it("rejects an empty token", () => {
    const result = redeemInviteSchema.safeParse({ token: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a token shorter than 32 characters", () => {
    const result = redeemInviteSchema.safeParse({ token: "abc" });
    expect(result.success).toBe(false);
  });
});
