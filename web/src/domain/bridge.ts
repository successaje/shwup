import { formatUnits } from "viem";

/** Chains a guest can bring USDC from, as Circle App Kit names them. EVM only: one wallet does it all. */
export const BRIDGE_SOURCES = [
  { key: "Base", label: "Base" },
  { key: "Ethereum", label: "Ethereum" },
  { key: "Arbitrum", label: "Arbitrum" },
  { key: "Optimism", label: "Optimism" },
  { key: "Polygon", label: "Polygon" },
] as const;
export type BridgeSource = (typeof BRIDGE_SOURCES)[number]["key"];

/** Headroom on top of the shortfall for Arc gas and Circle's relay fee, which is taken from the bridged amount. */
export const BRIDGE_HEADROOM = 500_000_000_000_000_000n; // $0.50 (Arc native USDC: 18 decimals)
export const MIN_BRIDGE = 1_000_000_000_000_000_000n; // $1.00

/**
 * How much to bring over, as a decimal string App Kit accepts: the shortfall plus headroom, rounded
 * up to the cent, never below $1.
 */
export function bridgeAmount(need: bigint, balance: bigint): string {
  const short = need > balance ? need - balance : 0n;
  let amount = short + BRIDGE_HEADROOM;
  if (amount < MIN_BRIDGE) amount = MIN_BRIDGE;
  const cent = 10_000_000_000_000_000n;
  const rounded = ((amount + cent - 1n) / cent) * cent;
  return Number(formatUnits(rounded, 18)).toFixed(2);
}
