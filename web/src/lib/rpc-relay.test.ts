import { describe, expect, it } from "vitest";
import { relayRejection } from "./rpc-relay";

const req = (method: string, id = 1) => ({ jsonrpc: "2.0", id, method, params: [] });

describe("relayRejection", () => {
  it("allows the reads the app makes, single or batched", () => {
    expect(relayRejection(req("eth_call"))).toBeNull();
    expect(relayRejection([req("eth_getBalance"), req("eth_getTransactionReceipt", 2)])).toBeNull();
  });

  it("refuses anything that sends, signs or touches accounts", () => {
    expect(relayRejection(req("eth_sendRawTransaction"))).toMatch(/not allowed/);
    expect(relayRejection(req("eth_sign"))).toMatch(/not allowed/);
    expect(relayRejection([req("eth_call"), req("eth_sendTransaction", 2)])).toMatch(/not allowed/);
  });

  it("refuses malformed or oversized batches", () => {
    expect(relayRejection({})).toBe("malformed request");
    expect(relayRejection([])).toBe("batch size");
    expect(relayRejection(Array.from({ length: 101 }, (_, i) => req("eth_call", i)))).toBe("batch size");
  });
});
