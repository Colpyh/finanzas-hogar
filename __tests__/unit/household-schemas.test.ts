import { updateHouseholdSchema } from "@/household/types";

describe("updateHouseholdSchema", () => {
  it("accepts a valid household name", () => {
    const result = updateHouseholdSchema.safeParse({ name: "Nuestro hogar" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = updateHouseholdSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a name longer than 50 characters", () => {
    const result = updateHouseholdSchema.safeParse({ name: "x".repeat(51) });
    expect(result.success).toBe(false);
  });
});
