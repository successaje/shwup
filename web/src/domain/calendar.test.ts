import { describe, expect, it } from "vitest";
import { ForfeitPolicy, type ShwUpEvent } from "./event";
import { googleCalendarUrl, icsFile, mapsUrl } from "./calendar";

const event: ShwUpEvent = {
  id: 7n,
  organizer: "0x0000000000000000000000000000000000000001",
  deposit: 5n * 10n ** 18n,
  startsAt: new Date("2026-10-10T17:30:00Z"),
  cancelCutoff: new Date("2026-10-09T17:30:00Z"),
  checkInEndsAt: new Date("2026-10-10T20:30:00Z"),
  capacity: 0,
  held: 0,
  checkedIn: 0,
  forfeitPolicy: ForfeitPolicy.Attendees,
  cancelled: false,
  settled: false,
  bonusPerAttendee: 0n,
  beneficiary: "0x0000000000000000000000000000000000000000",
  bond: 0n,
  bondPerGuest: 0n,
  details: { name: "Builders; Night, Lagos", location: "Co-Creation Hub, Yaba", description: "Line one\nLine two" },
};
const url = "https://shwup.vercel.app/e/7";

describe("calendar", () => {
  it("builds a Google Calendar link spanning the check-in window", () => {
    const u = new URL(googleCalendarUrl(event, url, "$5.00"));
    expect(u.searchParams.get("dates")).toBe("20261010T173000Z/20261010T203000Z");
    expect(u.searchParams.get("text")).toBe("Builders; Night, Lagos");
    expect(u.searchParams.get("details")).toContain(url);
  });

  it("writes a valid, escaped .ics with a 2-hour reminder", () => {
    const ics = icsFile(event, url, "$5.00", new Date("2026-10-03T00:00:00Z"));
    expect(ics).toContain("UID:shwup-7@shwup.app");
    expect(ics).toContain("SUMMARY:Builders\\; Night\\, Lagos");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics).toContain("DESCRIPTION:Your $5.00 deposit");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("links locations to maps", () => {
    expect(mapsUrl("Co-Creation Hub, Yaba")).toBe("https://www.google.com/maps/search/?api=1&query=Co-Creation%20Hub%2C%20Yaba");
  });
});
