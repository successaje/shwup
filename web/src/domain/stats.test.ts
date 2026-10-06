import { describe, expect, it } from "vitest";
import { ForfeitPolicy, type ShwUpEvent } from "./event";
import { protocolStats } from "./stats";

const $ = (n: number) => BigInt(Math.round(n * 100)) * 10n ** 16n;
const ev = (o: Partial<ShwUpEvent>): ShwUpEvent => ({
  id: 1n,
  organizer: "0x0000000000000000000000000000000000000001",
  deposit: $(5),
  startsAt: new Date(),
  cancelCutoff: new Date(),
  checkInEndsAt: new Date(),
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
  details: { name: "x", location: "y" },
  ...o,
});

describe("protocolStats", () => {
  it("adds up check-ins, refunds at the door and deposits still held", () => {
    const s = protocolStats([
      ev({ held: 10, checkedIn: 8, settled: true }), // 8 refunded; no-shows already settled
      ev({ held: 4, checkedIn: 1, deposit: $(10) }), // 1 refunded; 3 still held
      ev({ held: 6, cancelled: true }), // ignored
    ]);
    expect(s).toEqual({ events: 2, checkIns: 9, returnedAtDoor: $(50), heldNow: $(30) });
  });

  it("is all zeros with no events", () => {
    expect(protocolStats([])).toEqual({ events: 0, checkIns: 0, returnedAtDoor: 0n, heldNow: 0n });
  });
});
