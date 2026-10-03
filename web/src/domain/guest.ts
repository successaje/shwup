import { eventPhase, TicketStatus, type EventPhase, type ShwUpEvent } from "@/domain/event";

/** Visual state of a ticket stub. */
export type StubState = "preview" | "held" | "checkedIn" | "released" | "noShow" | "cancelled";

/**
 * Everything the guest page can show, derived from (event, ticket, now). One place decides what a
 * guest sees so the page never renders contradictory states.
 */
export type GuestView =
  | { kind: "invite"; phase: EventPhase; full: boolean; rejoin: boolean } // can hold a spot
  | { kind: "closed"; phase: EventPhase } // can't hold a spot and never had one
  | { kind: "holding"; phase: EventPhase; canCancel: boolean } // has a spot, waiting to arrive
  | { kind: "arrived"; bonus: "none" | "pending" | "claimable" | "claimed" } // checked in
  | { kind: "missed"; settled: boolean } // held a spot, check-in closed without them
  | { kind: "refund"; claimable: boolean }; // event cancelled

export type TicketLike = { status: TicketStatus; bonusClaimed: boolean; claimable: bigint };

export function guestView(event: ShwUpEvent, ticket: TicketLike | undefined, now = new Date()): GuestView {
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

  if (status === TicketStatus.Held) {
    if (phase === "closed" || phase === "settled") return { kind: "missed", settled: phase === "settled" };
    return { kind: "holding", phase, canCancel: now < event.cancelCutoff };
  }

  if (phase === "open" || phase === "doors") {
    const full = event.capacity > 0 && event.held >= event.capacity;
    return { kind: "invite", phase, full, rejoin: status === TicketStatus.Released };
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
  }
}
