import { defineChain, type Address, type Chain } from "viem";
import { arc, arcTestnet } from "viem/chains";

/**
 * ShwUp runs on exactly one chain per deployment, chosen at build time.
 * `local` is an anvil node for development; its native token stands in for Arc's native USDC.
 */
export type ChainKey = "arc" | "arcTestnet" | "local";

const local = defineChain({
  id: 31337,
  name: "Local (anvil)",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});

const chains: Record<ChainKey, Chain> = { arc, arcTestnet, local };

function readChainKey(): ChainKey {
  const key = process.env.NEXT_PUBLIC_SHWUP_CHAIN ?? "arcTestnet";
  if (key in chains) return key as ChainKey;
  throw new Error(`NEXT_PUBLIC_SHWUP_CHAIN must be one of ${Object.keys(chains).join(", ")}`);
}

export const chainKey = readChainKey();
export const chain = chains[chainKey];

export const rpcUrl = process.env.NEXT_PUBLIC_SHWUP_RPC_URL || chain.rpcUrls.default.http[0];

export const shwupAddress = (process.env.NEXT_PUBLIC_SHWUP_ADDRESS || undefined) as Address | undefined;

/** Explorer link for a transaction or address, when the chain has an explorer. */
export function explorerUrl(kind: "tx" | "address", value: string): string | undefined {
  const base = chain.blockExplorers?.default.url;
  return base ? `${base}/${kind}/${value}` : undefined;
}

/** Where people get USDC on this chain. */
export const fundingUrl =
  chainKey === "arc" ? "https://www.circle.com/usdc" : chainKey === "arcTestnet" ? "https://faucet.circle.com" : undefined;
