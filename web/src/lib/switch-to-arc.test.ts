import { describe, expect, it, vi } from "vitest";
import { chain } from "@/config/chain";
import { switchToArc } from "./switch-to-arc";

const notSupported = Object.assign(new Error('"MetaMask" does not support programmatic chain switching.'), { name: "SwitchChainNotSupportedError" });
const hexId = `0x${chain.id.toString(16)}`;

function wallet(knowsChain: boolean) {
  const calls: string[] = [];
  const request = vi.fn(async ({ method }: { method: string }) => {
    calls.push(method);
    if (method === "wallet_switchEthereumChain" && !knowsChain && !calls.includes("wallet_addEthereumChain")) {
      throw Object.assign(new Error("Unrecognized chain ID"), { code: 4902 });
    }
    return null;
  });
  return { calls, request, connector: { getProvider: async () => ({ request }) } as never };
}

describe("switchToArc", () => {
  it("uses wagmi's switch when it works", async () => {
    const w = wallet(true);
    const switchChainAsync = vi.fn(async () => undefined);
    await switchToArc({ connector: w.connector, switchChainAsync });
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: chain.id });
    expect(w.calls).toEqual([]);
  });

  it("asks the wallet directly when the connector can't switch", async () => {
    const w = wallet(true);
    await switchToArc({ connector: w.connector, switchChainAsync: async () => Promise.reject(notSupported) });
    expect(w.calls).toEqual(["wallet_switchEthereumChain"]);
    expect(w.request.mock.calls[0][0]).toMatchObject({ params: [{ chainId: hexId }] });
  });

  it("adds the chain when the wallet doesn't know it", async () => {
    const w = wallet(false);
    await switchToArc({ connector: w.connector, switchChainAsync: async () => Promise.reject(notSupported) });
    expect(w.calls).toEqual(["wallet_switchEthereumChain", "wallet_addEthereumChain"]);
    expect(w.request.mock.calls[1][0]).toMatchObject({ params: [{ chainId: hexId, rpcUrls: [chain.rpcUrls.default.http[0]] }] });
  });

  it("passes other errors through (e.g. the person declined)", async () => {
    const declined = Object.assign(new Error("User rejected"), { code: 4001 });
    await expect(switchToArc({ connector: wallet(true).connector, switchChainAsync: async () => Promise.reject(declined) })).rejects.toBe(declined);
  });
});
