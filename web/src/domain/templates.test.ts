import { describe, expect, it } from "vitest";
import { buildCreateEvent, defaultForm } from "./create-event";
import { TEMPLATES, templateFor } from "./templates";

const now = new Date("2026-10-03T12:00:00");

describe("templates", () => {
  it("each builds a valid event once named and placed", () => {
    for (const t of Object.values(TEMPLATES)) {
      const r = buildCreateEvent({ ...defaultForm(now), name: "Thing", location: "Somewhere", ...t.form }, now);
      expect(r.ok).toBe(true);
    }
  });

  it("books a table as a single spot with a 4-hour cutoff", () => {
    const r = buildCreateEvent({ ...defaultForm(now), location: "Maison", ...TEMPLATES.table.form }, now);
    expect(r.ok && r.args[1]).toBe(1);
    expect(r.ok && r.args[2] - r.args[3]).toBe(4n * 3600n);
  });

  it("ignores unknown keys", () => {
    expect(templateFor("nope")).toBeUndefined();
    expect(templateFor("__proto__")).toBeUndefined();
    expect(templateFor(null)).toBeUndefined();
  });
});
