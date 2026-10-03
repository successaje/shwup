import { formatUnits, parseUnits } from "viem";

/** Arc's native USDC uses 18 decimals. */
export const USDC_DECIMALS = 18;

/** Format a native USDC amount as dollars: 5000000000000000000n → "$5.00". */
export function formatUsd(amount: bigint, opts: { cents?: "always" | "auto" } = {}): string {
  const value = Number(formatUnits(amount, USDC_DECIMALS));
  const whole = Number.isInteger(value);
  const digits = opts.cents === "auto" && whole ? 0 : 2;
  // Sub-cent amounts (gas) shouldn't render as "$0.00".
  if (value > 0 && value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Parse a dollar string typed by a person ("5", "$5.50") into native USDC units, or null if invalid. */
export function parseUsd(input: string): bigint | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  try {
    return parseUnits(cleaned, USDC_DECIMALS);
  } catch {
    return null;
  }
}
