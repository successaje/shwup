import { getAddress, isAddress, type Address } from "viem";

/**
 * A ticket QR encodes a normal URL to the event page with the holder's address, so scanning it
 * with a phone camera opens something sensible, and the door scanner can parse it.
 *   https://shwup.app/e/12?ticket=0xabc…
 */
export function ticketUrl(origin: string, eventId: bigint, holder: Address): string {
  return `${origin}/e/${eventId}?ticket=${holder}`;
}

export type ParsedTicket = { eventId: bigint; holder: Address };

export function parseTicket(text: string): ParsedTicket | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  const match = url.pathname.match(/^\/e\/(\d{1,20})\/?$/);
  const holder = url.searchParams.get("ticket");
  if (!match || !holder || !isAddress(holder)) return null;
  return { eventId: BigInt(match[1]), holder: getAddress(holder) };
}
