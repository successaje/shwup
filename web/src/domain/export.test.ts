import { describe, expect, it } from "vitest";
import { TicketStatus } from "./event";
import { guestsCsv } from "./export";

describe("guestsCsv", () => {
  it("writes names, wallets and human statuses, quoting where needed", () => {
    const csv = guestsCsv(
      [
        { address: "0x1", status: TicketStatus.CheckedIn, name: 'Ada "A" Obi, PhD' },
        { address: "0x2", status: TicketStatus.Held },
        { address: "0x3", status: TicketStatus.Released, name: "Tunde" },
      ],
      { closed: true },
    );
    expect(csv).toBe('name,wallet,status\n"Ada ""A"" Obi, PhD",0x1,checked in\n,0x2,no-show\nTunde,0x3,cancelled\n');
  });
});
