import { describe, expect, it } from "vitest";
import { buildCreateEvent, defaultForm, defaultsFromForm, formFromEvent, formWithDefaults, type CreateEventForm } from "./create-event";

const now = new Date("2026-10-03T12:00:00");
const valid: CreateEventForm = {
  ...defaultForm(now),
  name: "Arc Builders Night",
  location: "The Workshop",
  startsAt: "2026-10-10T18:30",
};

describe("buildCreateEvent", () => {
  it("builds contract args from a valid form", () => {
    const r = buildCreateEvent(valid, now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [deposit, capacity, startsAt, cutoff, doorsClose, policy, metadata] = r.args;
    expect(deposit).toBe(5n * 10n ** 18n);
    expect(capacity).toBe(0);
    expect(cutoff).toBe(startsAt - 24n * 3600n);
    expect(doorsClose).toBe(startsAt + 3n * 3600n);
    expect(policy).toBe(0);
    expect(JSON.parse(metadata)).toEqual({ name: "Arc Builders Night", location: "The Workshop" });
  });

  it("requires name, location and a real deposit", () => {
    const r = buildCreateEvent({ ...valid, name: " ", location: "", deposit: "0" }, now);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["deposit", "location", "name"]);
  });

  it("rejects starts that are too soon", () => {
    const r = buildCreateEvent({ ...valid, startsAt: "2026-10-03T12:05" }, now);
    expect(r.ok).toBe(false);
  });

  it("caps deposits", () => {
    expect(buildCreateEvent({ ...valid, deposit: "1001" }, now).ok).toBe(false);
    expect(buildCreateEvent({ ...valid, deposit: "2.50" }, now).ok).toBe(true);
  });

  it("validates capacity", () => {
    expect(buildCreateEvent({ ...valid, capacity: "0" }, now).ok).toBe(false);
    expect(buildCreateEvent({ ...valid, capacity: "3.5" }, now).ok).toBe(false);
    const r = buildCreateEvent({ ...valid, capacity: "40" }, now);
    expect(r.ok && r.args[1]).toBe(40);
  });

  it("maps 'no cancellations' to a cutoff that has already passed", () => {
    const r = buildCreateEvent({ ...valid, cancel: "none" }, now);
    expect(r.ok && r.cutoff.getTime()).toBe(now.getTime());
  });
});

describe("formFromEvent", () => {
  const h = 3_600_000;
  const start = new Date("2026-10-01T18:30:00");
  const source = {
    details: { name: "Builders Night", location: "The Workshop", description: "Demos" },
    deposit: 25n * 10n ** 17n,
    capacity: 40,
    startsAt: start,
    cancelCutoff: new Date(start.getTime() - 24 * h),
    checkInEndsAt: new Date(start.getTime() + 3 * h),
    forfeitPolicy: 1,
  };

  it("copies details and terms onto the next future weekly slot", () => {
    const f = formFromEvent(source, new Date("2026-10-10T12:00:00"));
    expect(f.startsAt).toBe("2026-10-15T18:30");
    expect(f).toMatchObject({ name: "Builders Night", location: "The Workshop", description: "Demos", deposit: "2.5", capacity: "40", cancel: "24", doors: "3", forfeit: 1 });
  });

  it("snaps unusual windows to the nearest option", () => {
    const f = formFromEvent({ ...source, cancelCutoff: new Date(start.getTime() - 5 * h), checkInEndsAt: new Date(start.getTime() + 8 * h) }, new Date("2026-09-01"));
    expect(f.cancel).toBe("2");
    expect(f.doors).toBe("6");
  });

  it("round-trips through buildCreateEvent", () => {
    const now = new Date("2026-10-10T12:00:00");
    expect(buildCreateEvent(formFromEvent(source, now), now).ok).toBe(true);
  });
});

describe("organizer defaults", () => {
  it("prefills a new form with what the organizer used last", () => {
    const f = formWithDefaults({ location: "Common Kitchen", deposit: "10", forfeit: 1 });
    expect(f).toMatchObject({ location: "Common Kitchen", deposit: "10", forfeit: 1, name: "" });
  });

  it("captures reusable settings, not one-off details", () => {
    const d = defaultsFromForm({ ...valid, location: "  Hall B ", capacity: "30" });
    expect(d).toEqual({ location: "Hall B", deposit: "5", capacity: "30", cancel: "24", doors: "3", forfeit: 0 });
  });
});
