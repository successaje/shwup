import { describe, expect, it } from "vitest";
import { nameByteLength, validateName } from "./names";

describe("display names", () => {
  it("accepts empty and normal names", () => {
    expect(validateName("")).toBeNull();
    expect(validateName("  Ada O.  ")).toBeNull();
  });

  it("measures bytes like the contract, not characters", () => {
    expect(nameByteLength("Adé")).toBe(4);
    expect(validateName("é".repeat(16))).toBeNull(); // 32 bytes
    expect(validateName("é".repeat(17))).not.toBeNull(); // 34 bytes
  });
});
