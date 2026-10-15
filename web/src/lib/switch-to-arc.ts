"use client";

import { numberToHex, type EIP1193Provider } from "viem";
import type { Connector } from "wagmi";
import { chain } from "@/config/chain";

/** The `wallet_addEthereumChain` parameters for this deployment's chain. */
export function addChainParams() {
  return {
    chainId: numberToHex(chain.id),
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: [chain.rpcUrls.default.http[0]],
    blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
  };
}

const isUnknownChain = (e: unknown) => {
  const err = e as { code?: number; data?: { originalError?: { code?: number } }; message?: string };
  return err?.code === 4902 || err?.data?.originalError?.code === 4902 || /unrecognized chain|not been added|unknown chain/i.test(err?.message ?? "");
};

/**
 * Put the wallet on this deployment's chain. Uses wagmi's switch when the connector supports it;
 * otherwise (MetaMask mobile's in-app browser, some others) asks the wallet directly, adding the
 * chain first if the wallet doesn't know it.
 */
export async function switchToArc(opts: {
  connector: Connector | undefined;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
}): Promise<void> {
  try {
    await opts.switchChainAsync({ chainId: chain.id });
    return;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name !== "SwitchChainNotSupportedError" && !/does not support programmatic chain switching/i.test(String((e as Error)?.message))) throw e;
  }

  const provider = (await opts.connector?.getProvider()) as EIP1193Provider | undefined;
  if (!provider?.request) throw new Error("ChainSwitchUnavailable");
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(chain.id) }] });
  } catch (e) {
    if (!isUnknownChain(e)) throw e;
    await provider.request({ method: "wallet_addEthereumChain", params: [addChainParams()] });
  }
}
