"use client";

import { Wallet } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Address } from "viem";
import type { WalletAvailability } from "@/lib/server/wallet-config";

const noop = () => () => {};
const platform = () => (/iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) ? "apple" : /android/i.test(navigator.userAgent) ? "android" : "other");

/**
 * Put the ticket in Apple or Google Wallet, so the door works without opening ShwUp. Shows the
 * wallet that fits the device first; on desktop, both.
 */
export function AddToWallet({ eventId, holder, wallets }: { eventId: bigint; holder: Address; wallets: WalletAvailability }) {
  const device = useSyncExternalStore(noop, platform, () => "other");
  const apple = wallets.apple && device !== "android" && { href: `/api/passes/apple/${eventId}/${holder}`, label: "Add to Apple Wallet" };
  const google = wallets.google && device !== "apple" && { href: `/api/passes/google/${eventId}/${holder}`, label: "Add to Google Wallet" };
  const buttons = [apple, google].filter((b): b is { href: string; label: string } => !!b);
  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <a
          key={b.href}
          href={b.href}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          <Wallet className="size-4" />
          {b.label}
        </a>
      ))}
    </div>
  );
}
