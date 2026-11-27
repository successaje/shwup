import { describe, expect, it } from "vitest";
import { parseTheme, themeCookie } from "./theme";

describe("theme", () => {
  it("accepts explicit choices and falls back to the system setting", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("<script>")).toBe("system");
  });

  it("remembers the choice for a year across the whole site", () => {
    expect(themeCookie("dark")).toBe("shwup-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax");
  });
});
