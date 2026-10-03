import { describe, expect, it } from "vitest";
import { ForfeitPolicy, type ShwUpEvent } from "./event";
import { parseTicket } from "./ticket-code";
import { walletPassContent } from "./wallet-pass";

const event: ShwUpEvent = {
  id: 7n,
  organizer: "0x0000000000000000000000000000000000000001",
  deposit: 5n * 10n ** 18n,
  startsAt: new Date("2026-10-10T18:30:00Z"),
  cancelCutoff: new Date("2026-10-09T18:30:00Z"),
  checkInEndsAt: new Date("2026-10-10T21:30:00Z"),
  capacity: 0,
  held: 1,
  checkedIn: 0,
  forfeitPolicy: ForfeitPolicy.Beneficiary,
  cancelled: false,
  settled: false,
  bonusPerAttendee: 0n,
  beneficiary: "0x00000000000000000000000000000000000000fd",
  bond: 0n,
  bondPerGuest: 0n,
  details: { name: "Beach Cleanup", location: "Elegushi Beach", cause: "Lagos Food Bank" },
};
const holder = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" as const;
const contract = "0x191e7817E6fAafF2169660e6F13f2f3197ecBC9C" as const;

describe("walletPassContent", () => {
  const c = walletPassContent({ event, holder, holderName: " Ada ", origin: "https://shwup.vercel.app", chainId: 5042002, contract });

  it("encodes the same ticket the door scanner reads", () => {
    expect(parseTicket(c.barcode)).toEqual({ eventId: 7n, holder });
  });

  it("uses stable ids safe for both wallets", () => {
    expect(c.serial).toBe("shwup-5042002-191e7817-7-15d34aaf54267db7d7c367839aaf71a00a2c6a65");
    expect(c.serial).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(c.eventKey).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("says what happens to the money", () => {
    expect(c.deposit).toBe("$5.00");
    expect(c.terms).toContain("Lagos Food Bank");
    expect(c.holderName).toBe("Ada");
  });
});
