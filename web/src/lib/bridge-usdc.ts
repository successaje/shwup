"use client";

import type { EIP1193Provider } from "viem";
import type { BridgeSource } from "@/domain/bridge";

export type BridgeProgress = { step: string; state: "pending" | "success" | "error" | "noop"; explorerUrl?: string };

/**
 * Bring native USDC to Arc mainnet with Circle's CCTP via App Kit, from the guest's own wallet.
 * Circle's forwarder submits the mint on Arc and takes its fee from the bridged amount, so the guest
 * needs gas only on the source chain, not USDC already on Arc. The SDK is loaded on demand.
 */
async function load(provider: EIP1193Provider, source: BridgeSource) {
  const [{ AppKit }, { createViemAdapterFromProvider }, chains] = await Promise.all([
    import("@circle-fin/app-kit"),
    import("@circle-fin/adapter-viem-v2"),
    import("@circle-fin/app-kit/chains"),
  ]);
  const from = chains[source];
  const adapter = await createViemAdapterFromProvider({
    provider,
    capabilities: { addressContext: "user-controlled", supportedChains: [from, chains.Arc] },
  });
  return { kit: new AppKit(), adapter, from, to: chains.Arc };
}

/** Circle's fees (provider + forwarder) for a transfer, in USDC as a decimal string. */
export async function estimateBridgeFee(provider: EIP1193Provider, source: BridgeSource, amount: string, recipient: string): Promise<string> {
  const { kit, adapter, from, to } = await load(provider, source);
  const estimate = await kit.estimateBridge({ from: { adapter, chain: from }, to: { chain: to, recipientAddress: recipient, useForwarder: true }, amount });
  const total = estimate.fees.reduce((sum, f) => sum + Number(f.amount ?? 0), 0);
  return total.toFixed(2);
}

export async function bridgeToArc(opts: {
  provider: EIP1193Provider;
  source: BridgeSource;
  amount: string;
  recipient: string;
  onProgress: (steps: BridgeProgress[]) => void;
}): Promise<{ ok: boolean; steps: BridgeProgress[] }> {
  const { kit, adapter, from, to } = await load(opts.provider, opts.source);
  const steps: BridgeProgress[] = [];
  const mark = (step: string, state: BridgeProgress["state"], explorerUrl?: string) => {
    const i = steps.findIndex((s) => s.step === step);
    const next = { step, state, explorerUrl };
    if (i >= 0) steps[i] = next;
    else steps.push(next);
    opts.onProgress([...steps]);
  };
  kit.on("*", (payload) => {
    // Bridge events carry a method ("approve", "burn", "mint", …) and the step's explorer link.
    const p = payload as unknown as { method?: string; values?: { explorerUrl?: string } };
    const step = p.method?.replace(/^bridge\./, "");
    if (step) mark(step, "success", p.values?.explorerUrl);
  });
  const result = await kit.bridge({
    from: { adapter, chain: from },
    to: { chain: to, recipientAddress: opts.recipient, useForwarder: true },
    amount: opts.amount,
  });
  const final = result.steps.map((s) => ({ step: s.name, state: s.state, explorerUrl: s.explorerUrl }));
  opts.onProgress(final);
  return { ok: result.state === "success", steps: final };
}
