import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTE } from "./brand";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("brand palette", () => {
  it("matches the tokens the UI actually uses", () => {
    for (const s of PALETTE) {
      expect(css, `--${s.token}`).toContain(`--${s.token}: light-dark(${s.light}, ${s.dark});`);
    }
  });

  it("covers every colour token in globals.css", () => {
    const tokens = [...css.matchAll(/--([a-z0-9-]+): light-dark\(/g)].map((m) => m[1]).filter((t) => t !== "focus");
    expect(PALETTE.map((s) => s.token).sort()).toEqual(tokens.sort());
  });
});
