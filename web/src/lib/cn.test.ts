import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("lets later utilities override earlier ones", () => {
    expect(cn("inline-flex items-center", "hidden md:inline-flex")).toBe("items-center hidden md:inline-flex");
    expect(cn("bg-ink text-paper", "bg-night-ink text-night")).toBe("bg-night-ink text-night");
  });

  it("keeps a font size and a colour together (custom tokens)", () => {
    expect(cn("text-2xs text-ink-2")).toBe("text-2xs text-ink-2");
    expect(cn("text-sm text-ink-3", "text-ink")).toBe("text-sm text-ink");
    expect(cn("text-xs", "text-2xs")).toBe("text-2xs");
  });

  it("keeps different variants and custom animations", () => {
    expect(cn("animate-rise hover:text-ink", "motion-reduce:animate-none")).toBe("animate-rise hover:text-ink motion-reduce:animate-none");
    expect(cn("rounded-sm", false, undefined, "rounded-md")).toBe("rounded-md");
  });
});
