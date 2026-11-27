import type { Address } from "viem";
import { createSiweMessage } from "viem/siwe";

export const SIGN_IN_STATEMENT = "Sign in to ShwUp. This proves the wallet is yours. It doesn't move any money or cost a fee.";
export const SIGN_IN_TTL_MS = 10 * 60 * 1000;

/** The Sign-In With Ethereum message a wallet is asked to sign, bound to this site and chain. */
export function signInMessage({ address, chainId, nonce, origin, now = new Date() }: { address: Address; chainId: number; nonce: string; origin: string; now?: Date }) {
  return createSiweMessage({
    address,
    chainId,
    domain: new URL(origin).host,
    uri: origin,
    nonce,
    version: "1",
    statement: SIGN_IN_STATEMENT,
    issuedAt: now,
    expirationTime: new Date(now.getTime() + SIGN_IN_TTL_MS),
  });
}

/** Where to go after signing in: only paths on this site, never another origin. */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Copy for a failed sign-in, by the server's error code. */
export function signInErrorText(code: string): string {
  switch (code) {
    case "accounts-off":
      return "Accounts aren't switched on here yet. Your wallet still works for everything else.";
    case "expired":
    case "nonce":
      return "That sign-in request expired. Try again.";
    case "wrong-domain":
    case "wrong-chain":
      return "That signature was for a different site or network. Try again from this page.";
    case "signature":
      return "We couldn't verify that signature. Try again, or use a different wallet.";
    default:
      return "Sign-in didn't go through. Try again.";
  }
}
