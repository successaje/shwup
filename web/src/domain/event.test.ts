import { describe, expect, it } from "vitest";
import { decodeDetails, encodeDetails, eventPhase, spotsLeft } from "./event";

const h = (n: number) => n * 3_600_000;
const now = new Date("2026-10-10T18:00:00Z");
const base = {
  startsAt: new Date(now.getTime() + h(24)),
  checkInEndsAt: new Date(now.getTime() + h(27)),
  cancelled: false,
  settled: false,
};

describe("eventPhase", () => {
  it("walks through the lifecycle", () => {
    expect(eventPhase(base, now)).toBe("open");
    expect(eventPhase(base, new Date(now.getTime() + h(23)))).toBe("doors"); // 1h early
    expect(eventPhase(base, new Date(now.getTime() + h(27)))).toBe("closed");
    expect(eventPhase({ ...base, settled: true }, now)).toBe("settled");
    expect(eventPhase({ ...base, cancelled: true }, now)).toBe("cancelled");
  });
});

describe("details", () => {
  it("round-trips and trims", () => {
    const raw = encodeDetails({ name: "  Arc Lagos  ", location: "Yaba", description: " " });
    expect(raw).toBe('{"name":"Arc Lagos","location":"Yaba"}');
    expect(decodeDetails(raw)).toEqual({ name: "Arc Lagos", location: "Yaba", description: undefined });
  });

  it("survives hostile or broken metadata", () => {
    expect(decodeDetails("not json").name).toBe("Untitled event");
    expect(decodeDetails('{"name":42}').name).toBe("Untitled event");
    expect(decodeDetails(JSON.stringify({ name: "x".repeat(500), location: "y" })).name).toHaveLength(80);
  });
});

describe("spotsLeft", () => {
  it("treats capacity 0 as unlimited", () => {
    expect(spotsLeft({ capacity: 0, held: 10 })).toBeNull();
    expect(spotsLeft({ capacity: 10, held: 7 })).toBe(3);
  });
});
