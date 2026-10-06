import { parseEther } from "viem";
import { describe, expect, it } from "vitest";
import { bridgeAmount } from "./bridge";

describe("bridgeAmount", () => {
  it("covers the shortfall plus headroom, rounded up to the cent", () => {
    expect(bridgeAmount(parseEther("5"), parseEther("0.5"))).toBe("5.00");
    expect(bridgeAmount(parseEther("10"), parseEther("2.333"))).toBe("8.17");
  });

  it("never goes below a dollar", () => {
    expect(bridgeAmount(parseEther("5"), parseEther("4.9"))).toBe("1.00");
    expect(bridgeAmount(parseEther("5"), parseEther("9"))).toBe("1.00");
  });
});
