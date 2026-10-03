import { describe, expect, it } from "vitest";
import { parseTicket, ticketUrl } from "./ticket-code";

const holder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

describe("ticket codes", () => {
  it("round-trips", () => {
    const url = ticketUrl("https://shwup.app", 12n, holder);
    expect(parseTicket(url)).toEqual({ eventId: 12n, holder });
  });

  it("normalizes address checksum", () => {
    const parsed = parseTicket(`https://x.test/e/3?ticket=${holder.toLowerCase()}`);
    expect(parsed?.holder).toBe(holder);
  });

  it("rejects anything that isn't a ticket", () => {
    expect(parseTicket("hello")).toBeNull();
    expect(parseTicket("https://shwup.app/e/12")).toBeNull();
    expect(parseTicket("https://shwup.app/e/abc?ticket=" + holder)).toBeNull();
    expect(parseTicket("https://shwup.app/e/1?ticket=0x123")).toBeNull();
  });
});
