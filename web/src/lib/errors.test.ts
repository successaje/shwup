import { HttpRequestError, UserRejectedRequestError } from "viem";
import { describe, expect, it } from "vitest";
import { toFriendlyError, unconfirmed } from "./errors";

describe("toFriendlyError", () => {
  it("keeps the underlying message for the technical details toggle", () => {
    const f = toFriendlyError(new HttpRequestError({ url: "https://rpc.mainnet.arc.io", details: "Failed to fetch" }));
    expect(f.kind).toBe("network");
    expect(f.raw).toContain("Failed to fetch");
    expect(f.fundsSafe).toBe(true);
  });

  it("doesn't attach details to a plain cancellation", () => {
    expect(toFriendlyError(new UserRejectedRequestError(new Error("no"))).raw).toBeUndefined();
  });
});

describe("unconfirmed", () => {
  it("never claims funds are safe once a transaction was sent", () => {
    const f = unconfirmed("0xabc", new Error("Timed out while waiting for transaction"));
    expect(f).toMatchObject({ kind: "unconfirmed", fundsSafe: false, hash: "0xabc" });
  });
});
