import { describe, expect, it } from "vitest";
import { formatUsd, parseUsd } from "./money";

describe("parseUsd", () => {
  it("parses whole and cent amounts into 18-decimal units", () => {
    expect(parseUsd("5")).toBe(5n * 10n ** 18n);
    expect(parseUsd("$2.50")).toBe(25n * 10n ** 17n);
    expect(parseUsd(" 1,000 ")).toBe(1000n * 10n ** 18n);
  });

  it("rejects junk and sub-cent precision", () => {
    expect(parseUsd("")).toBeNull();
    expect(parseUsd("abc")).toBeNull();
    expect(parseUsd("1.234")).toBeNull();
    expect(parseUsd("-5")).toBeNull();
  });
});

describe("formatUsd", () => {
  it("formats dollars", () => {
    expect(formatUsd(5n * 10n ** 18n)).toBe("$5.00");
    expect(formatUsd(5n * 10n ** 18n, { cents: "auto" })).toBe("$5");
    expect(formatUsd(1666666666666666666n)).toBe("$1.67");
  });

  it("never shows a positive amount as $0.00", () => {
    expect(formatUsd(10n ** 15n)).toBe("<$0.01");
    expect(formatUsd(0n)).toBe("$0.00");
  });
});
