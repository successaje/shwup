import { describe, expect, it } from "vitest";
import { isMobileUserAgent, walletAppLinks } from "./walletconnect-links";

const URI = "wc:7f6e5d@2?relay-protocol=irn&symKey=abc123&expiryTimestamp=1";

describe("walletAppLinks", () => {
  it("passes the whole pairing URI, encoded, to each wallet", () => {
    for (const { href } of walletAppLinks(URI)) {
      expect(href.startsWith("https://")).toBe(true);
      expect(decodeURIComponent(href.split("uri=")[1])).toBe(URI);
    }
  });
});

describe("isMobileUserAgent", () => {
  it("tells phones from desktops", () => {
    expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
  });
});
