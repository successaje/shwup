import { describe, expect, it } from "vitest";
import { guestActivity, guestTotals, organizerRecord, showUpRecord } from "./activity";
import { ForfeitPolicy, TicketStatus, type ShwUpEvent } from "./event";

const now = new Date("2026-10-10T12:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 3_600_000);
const $ = (n: number) => BigInt(Math.round(n * 100)) * 10n ** 16n;

const ev = (over: Partial<ShwUpEvent> = {}): ShwUpEvent => ({
  id: 1n,
  organizer: "0x0000000000000000000000000000000000000001",
  deposit: $(5),
  startsAt: h(-5),
  cancelCutoff: h(-30),
  checkInEndsAt: h(-2),
  capacity: 0,
  held: 10,
  checkedIn: 8,
  forfeitPolicy: ForfeitPolicy.Attendees,
  cancelled: false,
  settled: true,
  bonusPerAttendee: $(1.25),
  beneficiary: "0x0000000000000000000000000000000000000000",
  bond: 0n,
  bondPerGuest: 0n,
  details: { name: "Meetup", location: "Here" },
  ...over,
});
const t = (status: TicketStatus, bonusClaimed = false, claimable = 0n) => ({ status, bonusClaimed, claimable });

describe("guestActivity", () => {
  it("records the door refund and the collected bonus", () => {
    const items = guestActivity(ev(), t(TicketStatus.CheckedIn, true), now);
    expect(items.map((i) => [i.kind, i.amount])).toEqual([
      ["returned", $(5)],
      ["bonus", $(1.25)],
    ]);
  });

  it("marks a waiting bonus as owed", () => {
    expect(guestActivity(ev(), t(TicketStatus.CheckedIn, false, $(1.25)), now).map((i) => i.kind)).toEqual(["returned", "bonusOwed"]);
  });

  it("distinguishes holding, forfeited, refunded and refund owed", () => {
    expect(guestActivity(ev({ checkInEndsAt: h(5), settled: false }), t(TicketStatus.Held), now)[0].kind).toBe("holding");
    expect(guestActivity(ev(), t(TicketStatus.Held), now)[0].kind).toBe("forfeited");
    expect(guestActivity(ev(), t(TicketStatus.Released), now)[0].kind).toBe("refunded");
    expect(guestActivity(ev({ cancelled: true }), t(TicketStatus.Held), now)[0].kind).toBe("refundOwed");
  });
});

describe("totals and records", () => {
  it("adds up money by meaning", () => {
    const items = [
      ...guestActivity(ev(), t(TicketStatus.CheckedIn, true), now),
      ...guestActivity(ev({ id: 2n }), t(TicketStatus.Held), now),
      ...guestActivity(ev({ id: 3n, checkInEndsAt: h(5), settled: false }), t(TicketStatus.Held), now),
    ];
    expect(guestTotals(items)).toEqual({ held: $(5), returned: $(5), earned: $(1.25), owed: 0n, forfeited: $(5) });
  });

  it("counts show-ups only for decided events", () => {
    const r = showUpRecord(
      [
        { event: ev(), ticket: t(TicketStatus.CheckedIn) },
        { event: ev(), ticket: t(TicketStatus.Held) },
        { event: ev({ checkInEndsAt: h(5) }), ticket: t(TicketStatus.Held) },
        { event: ev({ cancelled: true }), ticket: t(TicketStatus.Held) },
      ],
      now,
    );
    expect(r).toEqual({ attended: 1, decided: 2 });
  });

  it("summarizes an organizer's finished events", () => {
    const r = organizerRecord(
      [ev(), ev({ held: 10, checkedIn: 5, forfeitPolicy: ForfeitPolicy.Organizer }), ev({ checkInEndsAt: h(5) }), ev({ cancelled: true })],
      now,
    );
    expect(r.hosted).toBe(3);
    expect(r.finished).toBe(2);
    expect(r.showUpRate).toBeCloseTo(13 / 20);
    expect(r.forfeitsKept).toBe($(25));
  });
});
