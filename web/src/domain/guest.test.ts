import { describe, expect, it } from "vitest";
import { ForfeitPolicy, TicketStatus, type ShwUpEvent } from "./event";
import { guestView, offerFor } from "./guest";

const now = new Date("2026-10-10T12:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 3_600_000);

const event: ShwUpEvent = {
  id: 1n,
  organizer: "0x0000000000000000000000000000000000000001",
  deposit: 5n * 10n ** 18n,
  startsAt: h(24),
  cancelCutoff: h(12),
  checkInEndsAt: h(27),
  capacity: 2,
  held: 1,
  checkedIn: 0,
  forfeitPolicy: ForfeitPolicy.Attendees,
  cancelled: false,
  settled: false,
  bonusPerAttendee: 0n,
  beneficiary: "0x0000000000000000000000000000000000000000",
  bond: 0n,
  bondPerGuest: 0n,
  details: { name: "Meetup", location: "Here" },
};
const t = (status: TicketStatus, extra: Partial<{ bonusClaimed: boolean; claimable: bigint }> = {}) => ({
  status,
  bonusClaimed: false,
  claimable: 0n,
  ...extra,
});

describe("guestView", () => {
  it("invites people without a spot", () => {
    expect(guestView(event, undefined, now)).toEqual({
      kind: "invite",
      phase: "open",
      full: false,
      rejoin: false,
      handedOver: false,
      offer: null,
    });
    expect(guestView({ ...event, held: 2 }, undefined, now)).toMatchObject({ kind: "invite", full: true });
    expect(guestView(event, t(TicketStatus.Released), now)).toMatchObject({ kind: "invite", rejoin: true });
  });

  it("lets people take a spot someone gave up, even when full", () => {
    const leaver = "0x00000000000000000000000000000000000000aa";
    expect(guestView({ ...event, held: 2 }, undefined, now, leaver)).toMatchObject({ kind: "invite", full: false, offer: leaver });
    expect(guestView(event, t(TicketStatus.Transferred), now)).toMatchObject({ kind: "invite", rejoin: true, handedOver: true });
    expect(guestView(event, { ...t(TicketStatus.Held), offered: true }, h(13))).toMatchObject({ kind: "holding", offered: true });
  });

  it("shows a held ticket with the cancel window", () => {
    expect(guestView(event, t(TicketStatus.Held), now)).toEqual({ kind: "holding", phase: "open", canCancel: true, offered: false });
    expect(guestView(event, t(TicketStatus.Held), h(13))).toMatchObject({ kind: "holding", canCancel: false });
    expect(guestView(event, t(TicketStatus.Held), h(23.5))).toMatchObject({ kind: "holding", phase: "doors" });
  });

  it("marks arrivals and their bonus", () => {
    expect(guestView(event, t(TicketStatus.CheckedIn), h(24))).toEqual({ kind: "arrived", bonus: "pending" });
    const settled = { ...event, settled: true, bonusPerAttendee: 10n };
    expect(guestView(settled, t(TicketStatus.CheckedIn), h(30))).toEqual({ kind: "arrived", bonus: "claimable" });
    expect(guestView(settled, t(TicketStatus.CheckedIn, { bonusClaimed: true }), h(30))).toEqual({ kind: "arrived", bonus: "claimed" });
    expect(guestView({ ...event, forfeitPolicy: ForfeitPolicy.Organizer }, t(TicketStatus.CheckedIn), h(24))).toEqual({ kind: "arrived", bonus: "none" });
  });

  it("tells no-shows what happened", () => {
    expect(guestView(event, t(TicketStatus.Held), h(28))).toEqual({ kind: "missed", settled: false });
    expect(guestView({ ...event, settled: true }, t(TicketStatus.Held), h(28))).toEqual({ kind: "missed", settled: true });
  });

  it("offers refunds when the event is cancelled", () => {
    const cancelled = { ...event, cancelled: true };
    expect(guestView(cancelled, t(TicketStatus.Held), now)).toEqual({ kind: "refund", claimable: true });
    expect(guestView(cancelled, t(TicketStatus.Released), now)).toEqual({ kind: "refund", claimable: false });
    expect(guestView(cancelled, undefined, now)).toEqual({ kind: "closed", phase: "cancelled" });
  });

  it("closes RSVPs after check-in ends", () => {
    expect(guestView(event, undefined, h(28))).toEqual({ kind: "closed", phase: "closed" });
  });
});

describe("offerFor", () => {
  const me = "0x00000000000000000000000000000000000000b0" as const;
  const anyone = "0x0000000000000000000000000000000000000000" as const;
  const a = "0x00000000000000000000000000000000000000a1" as const;
  const b = "0x00000000000000000000000000000000000000a2" as const;

  it("prefers an offer made to the viewer by name", () => {
    expect(offerFor([{ holder: a, to: anyone }, { holder: b, to: me }], me)).toBe(b);
  });

  it("takes open offers, never ones meant for someone else or the viewer's own", () => {
    expect(offerFor([{ holder: a, to: b }], me)).toBeNull();
    expect(offerFor([{ holder: me, to: anyone }], me)).toBeNull();
    expect(offerFor([{ holder: a, to: anyone }], undefined)).toBe(a);
    expect(offerFor(undefined, me)).toBeNull();
  });
});
