import { describe, expect, it } from "vitest";
import { buildCreateEvent, defaultForm, type CreateEventForm } from "./create-event";

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
