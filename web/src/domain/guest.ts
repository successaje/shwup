import type { Address } from "viem";
import { eventPhase, TicketStatus, type EventPhase, type ShwUpEvent } from "@/domain/event";

/** Visual state of a ticket stub. */
export type StubState = "preview" | "held" | "checkedIn" | "released" | "noShow" | "cancelled";

/**
 * Everything the guest page can show, derived from (event, ticket, now). One place decides what a
 * guest sees so the page never renders contradictory states.
 */
export type GuestView =
  | { kind: "invite"; phase: EventPhase; full: boolean; rejoin: boolean; handedOver: boolean; offer: Address | null } // can hold a spot
  | { kind: "closed"; phase: EventPhase } // can't hold a spot and never had one
  | { kind: "holding"; phase: EventPhase; canCancel: boolean; offered: boolean } // has a spot, waiting to arrive
  | { kind: "arrived"; bonus: "none" | "pending" | "claimable" | "claimed" } // checked in
  | { kind: "missed"; settled: boolean } // held a spot, check-in closed without them
  | { kind: "refund"; claimable: boolean } // event cancelled
  | { kind: "doorNeverOpened"; claimable: boolean }; // check-in closed with nobody checked in: everyone's refunded

export type TicketLike = { status: TicketStatus; bonusClaimed: boolean; claimable: bigint; offered?: boolean };

/** A spot someone has put up for grabs: `to` is who may take it (zero address = anyone). */
export type SpotOffer = { holder: Address; to: Address };

const ZERO = "0x0000000000000000000000000000000000000000";

/** The offer `viewer` should take, preferring one made to them by name. */
export function offerFor(offers: readonly SpotOffer[] | undefined, viewer: Address | undefined): Address | null {
  const mine = viewer && offers?.find((o) => o.to.toLowerCase() === viewer.toLowerCase() && o.holder.toLowerCase() !== viewer.toLowerCase());
  const open = offers?.find((o) => o.to === ZERO && o.holder.toLowerCase() !== viewer?.toLowerCase());
  return (mine || open)?.holder ?? null;
}

export function guestView(
  event: ShwUpEvent,
  ticket: TicketLike | undefined,
  now = new Date(),
  offer: Address | null = null,
): GuestView {
  const phase = eventPhase(event, now);
  const status = ticket?.status ?? TicketStatus.None;

  if (phase === "cancelled") {
    if (status === TicketStatus.Held) return { kind: "refund", claimable: true };
    if (status === TicketStatus.Released && ticket) return { kind: "refund", claimable: false };
    return { kind: "closed", phase };
  }

  if (status === TicketStatus.CheckedIn) {
    if (!event.settled) return { kind: "arrived", bonus: event.forfeitPolicy === 0 && event.held > event.checkedIn ? "pending" : "none" };
    if (event.bonusPerAttendee === 0n) return { kind: "arrived", bonus: "none" };
    return { kind: "arrived", bonus: ticket?.bonusClaimed ? "claimed" : "claimable" };
  }

  const over = phase === "closed" || phase === "settled";
  if (over && event.checkedIn === 0 && ticket && (status === TicketStatus.Held || status === TicketStatus.Released)) {
    return { kind: "doorNeverOpened", claimable: status === TicketStatus.Held };
  }

  if (status === TicketStatus.Held) {
    if (over) return { kind: "missed", settled: phase === "settled" };
    return { kind: "holding", phase, canCancel: now < event.cancelCutoff, offered: !!ticket?.offered };
  }

  if (phase === "open" || phase === "doors") {
    // Taking someone's spot works even when the event is full.
    const full = !offer && event.capacity > 0 && event.held >= event.capacity;
    return {
      kind: "invite",
      phase,
      full,
      rejoin: status === TicketStatus.Released || status === TicketStatus.Transferred,
      handedOver: status === TicketStatus.Transferred,
      offer,
    };
  }
  return { kind: "closed", phase };
}

export function stubState(view: GuestView): StubState {
  switch (view.kind) {
    case "invite":
    case "closed":
      return "preview";
    case "holding":
      return "held";
    case "arrived":
      return "checkedIn";
    case "missed":
      return view.settled ? "noShow" : "held";
    case "refund":
      return view.claimable ? "cancelled" : "released";
    case "doorNeverOpened":
      return view.claimable ? "held" : "released";
  }
}
