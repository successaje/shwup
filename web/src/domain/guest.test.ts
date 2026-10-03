import { describe, expect, it } from "vitest";
import { ForfeitPolicy, TicketStatus, type ShwUpEvent } from "./event";
import { guestView } from "./guest";

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
    expect(guestView(event, undefined, now)).toEqual({ kind: "invite", phase: "open", full: false, rejoin: false });
    expect(guestView({ ...event, held: 2 }, undefined, now)).toMatchObject({ kind: "invite", full: true });
    expect(guestView(event, t(TicketStatus.Released), now)).toMatchObject({ kind: "invite", rejoin: true });
  });

  it("shows a held ticket with the cancel window", () => {
    expect(guestView(event, t(TicketStatus.Held), now)).toEqual({ kind: "holding", phase: "open", canCancel: true });
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
