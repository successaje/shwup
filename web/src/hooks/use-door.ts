"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createWalletClient, type Address, type Hash, type WalletClient } from "viem";
import { transport } from "@/lib/wagmi";
import type { PrivateKeyAccount } from "viem/accounts";
import { usePublicClient, useWalletClient } from "wagmi";
import { chain, shwupAddress } from "@/config/chain";
import { TicketStatus, type ShwUpEvent } from "@/domain/event";
import { parseTicket } from "@/domain/ticket-code";
import { shwupAbi } from "@/lib/contracts/shwup-abi";
import { toFriendlyError } from "@/lib/errors";

export type ScanOutcome =
  | "checkedIn" // deposit refunded just now
  | "already" // was checked in before
  | "notOnList" // no held spot for this event
  | "wrongEvent" // ticket for another event
  | "invalid" // not a ShwUp ticket
  | "failed"; // transaction failed

export type ScanResult = {
  seq: number;
  outcome: ScanOutcome;
  holder?: Address;
  /** Public display name, when the guest set one. */
  name?: string;
  detail?: string;
  finalityMs?: number;
  hash?: Hash;
};

const DEDUPE_MS = 4_000;

/**
 * Turns scanned text into check-ins, one at a time. Ticket status is read first so repeats and
 * strangers get instant answers without spending gas.
 */
export function useDoor(event: ShwUpEvent, doorKey: PrivateKeyAccount | null) {
  const publicClient = usePublicClient({ chainId: chain.id });
  const { data: walletClient } = useWalletClient({ chainId: chain.id });
  const [results, setResults] = useState<ScanResult[]>([]);
  const [working, setWorking] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const seq = useRef(0);
  const pending = useRef(0);
  const lastSeen = useRef<{ text: string; at: number } | null>(null);

  // Prefer the door key (no prompts); fall back to the organizer's own wallet.
  const signer: WalletClient | undefined = useMemo(
    () => (doorKey ? createWalletClient({ account: doorKey, chain, transport: transport() }) : walletClient),
    [doorKey, walletClient],
  );

  const push = (r: Omit<ScanResult, "seq">) => setResults((prev) => [{ ...r, seq: ++seq.current }, ...prev].slice(0, 30));

  const handle = useCallback(
    async (text: string) => {
      const ticket = parseTicket(text);
      if (!ticket) return push({ outcome: "invalid" });
      if (ticket.eventId !== event.id) return push({ outcome: "wrongEvent", holder: ticket.holder });
      if (!publicClient || !signer?.account || !shwupAddress) {
        return push({ outcome: "failed", holder: ticket.holder, detail: "Door isn't ready yet." });
      }

      const [current, rawName] = await Promise.all([
        publicClient.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "ticketOf", args: [event.id, ticket.holder] }),
        publicClient.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "nameOf", args: [ticket.holder] }),
      ]);
      const name = rawName.trim() || undefined;
      if (current.status === TicketStatus.CheckedIn) return push({ outcome: "already", holder: ticket.holder, name });
      if (current.status !== TicketStatus.Held) return push({ outcome: "notOnList", holder: ticket.holder, name });

      try {
        const { request } = await publicClient.simulateContract({
          address: shwupAddress,
          abi: shwupAbi,
          functionName: "checkIn",
          args: [event.id, ticket.holder],
          account: signer.account,
        });
        const hash = await signer.writeContract(request);
        const sentAt = performance.now();
        const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 200 });
        if (receipt.status !== "success") throw new Error("reverted");
        push({ outcome: "checkedIn", holder: ticket.holder, name, hash, finalityMs: Math.round(performance.now() - sentAt) });
      } catch (e) {
        console.error(e);
        const f = toFriendlyError(e);
        push({ outcome: "failed", holder: ticket.holder, name, detail: f.kind === "funds" ? "The door key is out of gas. Top it up." : f.title });
      }
    },
    [event.id, publicClient, signer],
  );

  /** Queue a scan. Identical scans within a few seconds are ignored (cameras fire repeatedly). */
  const scan = useCallback(
    (text: string) => {
      const now = Date.now();
      if (lastSeen.current && lastSeen.current.text === text && now - lastSeen.current.at < DEDUPE_MS) return;
      lastSeen.current = { text, at: now };
      pending.current += 1;
      setWorking(true);
      queue.current = queue.current
        .then(() => handle(text))
        .finally(() => {
          pending.current -= 1;
          if (pending.current === 0) setWorking(false);
        });
    },
    [handle],
  );

  return { scan, results, working, ready: Boolean(signer?.account), usingDoorKey: Boolean(doorKey) };
}
