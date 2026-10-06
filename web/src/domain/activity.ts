import { eventPhase, ForfeitPolicy, noShows, TicketStatus, type ShwUpEvent } from "@/domain/event";

/**
 * A person's history with ShwUp, derived from contract state rather than logs: exact, needs no
 * indexer, and doesn't depend on how far back an RPC lets you query.
 */
export type ActivityKind =
  | "holding" // deposit currently held
  | "returned" // got deposit back at the door
  | "refunded" // cancelled (or event cancelled) — deposit back, plus any share of the host's bond
  | "handedOver" // gave the spot to someone who paid the deposit back
  | "refundOwed" // event cancelled, refund waiting to be claimed
  | "forfeited" // didn't show
  | "bonus" // collected share of no-shows
  | "bonusOwed" // share of no-shows waiting
  | "hosted"; // organized this event

export type ActivityItem = {
  key: string;
  kind: ActivityKind;
  event: ShwUpEvent;
  amount: bigint;
  at: Date; // best available anchor: the event's start
};

export type GuestTicket = { status: TicketStatus; bonusClaimed: boolean; claimable: bigint };

export function guestActivity(event: ShwUpEvent, ticket: GuestTicket, now = new Date()): ActivityItem[] {
  const base = { event, at: event.startsAt };
  const k = (kind: ActivityKind) => `${event.id}-${kind}`;
  const phase = eventPhase(event, now);

  switch (ticket.status) {
    case TicketStatus.Held:
      if (event.cancelled) return [{ ...base, key: k("refundOwed"), kind: "refundOwed", amount: event.deposit + event.bondPerGuest }];
      if (phase === "closed" || phase === "settled") {
        // Nobody checked in at all: the deposit is refunded, not forfeited.
        if (event.checkedIn === 0) return [{ ...base, key: k("refundOwed"), kind: "refundOwed", amount: event.deposit }];
        return [{ ...base, key: k("forfeited"), kind: "forfeited", amount: event.deposit }];
      }
      return [{ ...base, key: k("holding"), kind: "holding", amount: event.deposit }];
    case TicketStatus.Released:
      return [{ ...base, key: k("refunded"), kind: "refunded", amount: event.deposit + (event.cancelled ? event.bondPerGuest : 0n) }];
    case TicketStatus.Transferred:
      return [{ ...base, key: k("handedOver"), kind: "handedOver", amount: event.deposit }];
    case TicketStatus.CheckedIn: {
      const items: ActivityItem[] = [{ ...base, key: k("returned"), kind: "returned", amount: event.deposit }];
      if (ticket.bonusClaimed) items.push({ ...base, at: event.checkInEndsAt, key: k("bonus"), kind: "bonus", amount: event.bonusPerAttendee });
      else if (ticket.claimable > 0n) items.push({ ...base, at: event.checkInEndsAt, key: k("bonusOwed"), kind: "bonusOwed", amount: ticket.claimable });
      return items;
    }
    default:
      return [];
  }
}

/** Money summary across a guest's history. */
export function guestTotals(items: ActivityItem[]) {
  const sum = (kinds: ActivityKind[]) => items.filter((i) => kinds.includes(i.kind)).reduce((a, i) => a + i.amount, 0n);
  return {
    held: sum(["holding"]),
    returned: sum(["returned", "refunded", "handedOver"]),
    earned: sum(["bonus"]),
    owed: sum(["bonusOwed", "refundOwed"]),
    forfeited: sum(["forfeited"]),
  };
}

/** Reliability: of the events whose check-in has closed where you held a spot, how many you made. */
export function showUpRecord(entries: { event: ShwUpEvent; ticket: GuestTicket }[], now = new Date()) {
  let attended = 0;
  let decided = 0;
  for (const { event, ticket } of entries) {
    if (event.cancelled) continue;
    if (ticket.status === TicketStatus.CheckedIn) {
      attended++;
      decided++;
    } else if (ticket.status === TicketStatus.Held && now >= event.checkInEndsAt && event.checkedIn > 0) {
      decided++;
    }
  }
  return { attended, decided };
}

/**
 * An organizer's track record, from public state: how many finished events they've run and what
 * share of RSVPs actually got checked in. Under the "organizer keeps forfeits" policy a low rate is
 * a warning sign — the organizer profits when guests aren't scanned.
 */
export function organizerRecord(events: ShwUpEvent[], now = new Date()) {
  const finished = events.filter((e) => !e.cancelled && now >= e.checkInEndsAt && e.held > 0);
  const held = finished.reduce((a, e) => a + e.held, 0);
  const came = finished.reduce((a, e) => a + e.checkedIn, 0);
  const kept = finished.filter((e) => e.forfeitPolicy === ForfeitPolicy.Organizer && e.checkedIn > 0).reduce((a, e) => a + BigInt(noShows(e)) * e.deposit, 0n);
  return {
    hosted: events.filter((e) => !e.cancelled).length,
    finished: finished.length,
    showUpRate: held > 0 ? came / held : null,
    forfeitsKept: kept,
  };
}
