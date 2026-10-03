import type { Address } from "viem";
import { forfeitRecipient, type ShwUpEvent } from "@/domain/event";
import { ticketUrl } from "@/domain/ticket-code";
import { formatUsd } from "@/lib/money";

/**
 * What a wallet pass says, independent of Apple or Google. The barcode is the same ticket URL the
 * on-screen QR encodes, so door mode scans a pass exactly like the ticket page.
 */
export type WalletPassContent = {
  /** Stable per chain + contract + event + holder; re-adding replaces rather than duplicates. */
  serial: string;
  eventKey: string; // stable per chain + contract + event
  eventName: string;
  location: string;
  startsAt: Date;
  checkInEndsAt: Date;
  cancelCutoff: Date;
  holderName: string | null;
  holder: Address;
  deposit: string; // "$5.00"
  promise: string; // "Back when you're scanned in"
  barcode: string;
  pageUrl: string;
  terms: string;
};

export function walletPassContent(input: {
  event: ShwUpEvent;
  holder: Address;
  holderName: string | null;
  origin: string;
  chainId: number;
  contract: Address;
}): WalletPassContent {
  const { event, holder, origin, chainId, contract } = input;
  const eventKey = `shwup-${chainId}-${contract.slice(2, 10).toLowerCase()}-${event.id}`;
  const deposit = formatUsd(event.deposit);
  return {
    serial: `${eventKey}-${holder.slice(2).toLowerCase()}`,
    eventKey,
    eventName: event.details.name,
    location: event.details.location,
    startsAt: event.startsAt,
    checkInEndsAt: event.checkInEndsAt,
    cancelCutoff: event.cancelCutoff,
    holderName: input.holderName?.trim() || null,
    holder,
    deposit,
    promise: "Back when you're scanned in",
    barcode: ticketUrl(origin, event.id, holder),
    pageUrl: `${origin}/e/${event.id}`,
    terms:
      `Your ${deposit} sits in the ShwUp contract on Arc, not with the organizer. It comes back the moment ` +
      `you're scanned in at the door. If you never arrive, it goes to ${forfeitRecipient(event)}. ` +
      `Can't make it? Cancel before the cutoff for a full refund, or pass your spot to someone else from your ticket page.`,
  };
}
