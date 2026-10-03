import type { Address } from "viem";

/** Mirrors ShwUp.ForfeitPolicy. */
export enum ForfeitPolicy {
  Attendees = 0,
  Organizer = 1,
  Beneficiary = 2,
}

/** Mirrors ShwUp.TicketStatus. */
export enum TicketStatus {
  None = 0,
  Held = 1,
  CheckedIn = 2,
  Released = 3,
  Transferred = 4,
}

/** Human-entered details, stored on-chain as compact JSON. */
export type EventDetails = {
  name: string;
  location: string;
  description?: string;
  cause?: string; // who receives no-show deposits under ForfeitPolicy.Beneficiary, e.g. "Lagos Food Bank"
};

export type ShwUpEvent = {
  id: bigint;
  organizer: Address;
  deposit: bigint;
  startsAt: Date;
  cancelCutoff: Date;
  checkInEndsAt: Date;
  capacity: number; // 0 = unlimited
  held: number;
  checkedIn: number;
  forfeitPolicy: ForfeitPolicy;
  cancelled: boolean;
  settled: boolean;
  bonusPerAttendee: bigint;
  beneficiary: Address; // zero unless forfeitPolicy is Beneficiary
  bond: bigint; // organizer's bond: back to them at settlement, or split among guests if they cancel
  bondPerGuest: bigint; // set when cancelled
  details: EventDetails;
};

/** Contract constant EARLY_CHECK_IN. */
export const EARLY_CHECK_IN_MS = 60 * 60 * 1000;

export const LIMITS = {
  name: 80,
  location: 120,
  description: 600,
  cause: 60,
  metadataBytes: 2048,
} as const;

/**
 * Where an event is in its life, from everyone's point of view.
 * - open: taking RSVPs, before doors
 * - doors: check-in is open
 * - closed: check-in closed, waiting for someone to settle
 * - settled / cancelled: final
 */
export type EventPhase = "open" | "doors" | "closed" | "settled" | "cancelled";

export function eventPhase(e: Pick<ShwUpEvent, "startsAt" | "checkInEndsAt" | "cancelled" | "settled">, now = new Date()): EventPhase {
  if (e.cancelled) return "cancelled";
  if (e.settled) return "settled";
  if (now >= e.checkInEndsAt) return "closed";
  if (now.getTime() + EARLY_CHECK_IN_MS >= e.startsAt.getTime()) return "doors";
  return "open";
}

export function canStillCancelSpot(e: Pick<ShwUpEvent, "cancelCutoff" | "cancelled">, now = new Date()): boolean {
  return !e.cancelled && now < e.cancelCutoff;
}

export function spotsLeft(e: Pick<ShwUpEvent, "capacity" | "held">): number | null {
  return e.capacity === 0 ? null : Math.max(0, e.capacity - e.held);
}

export function noShows(e: Pick<ShwUpEvent, "held" | "checkedIn">): number {
  return e.held - e.checkedIn;
}

/** Who no-show deposits go to, as a phrase: "the people who came", "the organizer", "Lagos Food Bank". */
export function forfeitRecipient(e: Pick<ShwUpEvent, "forfeitPolicy" | "beneficiary" | "details">): string {
  switch (e.forfeitPolicy) {
    case ForfeitPolicy.Attendees:
      return "the people who came";
    case ForfeitPolicy.Organizer:
      return "the organizer";
    case ForfeitPolicy.Beneficiary:
      return e.details.cause || `${e.beneficiary.slice(0, 6)}…${e.beneficiary.slice(-4)}`;
  }
}

export function encodeDetails(details: EventDetails): string {
  const clean: EventDetails = {
    name: details.name.trim(),
    location: details.location.trim(),
    ...(details.description?.trim() ? { description: details.description.trim() } : {}),
    ...(details.cause?.trim() ? { cause: details.cause.trim() } : {}),
  };
  return JSON.stringify(clean);
}

/** Never throws: metadata is user-supplied and lives on a public chain. */
export function decodeDetails(raw: string): EventDetails {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      return {
        name: typeof o.name === "string" && o.name.trim() ? o.name.slice(0, LIMITS.name) : "Untitled event",
        location: typeof o.location === "string" ? o.location.slice(0, LIMITS.location) : "",
        description: typeof o.description === "string" ? o.description.slice(0, LIMITS.description) : undefined,
        ...(typeof o.cause === "string" && o.cause.trim() ? { cause: o.cause.slice(0, LIMITS.cause) } : {}),
      };
    }
  } catch {
    // fall through
  }
  return { name: "Untitled event", location: "" };
}

type RawEvent = {
  organizer: Address;
  deposit: bigint;
  startsAt: bigint;
  cancelCutoff: bigint;
  checkInEndsAt: bigint;
  capacity: number;
  held: number;
  checkedIn: number;
  forfeitPolicy: number;
  cancelled: boolean;
  settled: boolean;
  bonusPerAttendee: bigint;
  beneficiary: Address;
  bond: bigint;
  bondPerGuest: bigint;
  metadata: string;
};

const fromSeconds = (s: bigint) => new Date(Number(s) * 1000);

export function toShwUpEvent(id: bigint, raw: RawEvent): ShwUpEvent {
  return {
    id,
    organizer: raw.organizer,
    deposit: raw.deposit,
    startsAt: fromSeconds(raw.startsAt),
    cancelCutoff: fromSeconds(raw.cancelCutoff),
    checkInEndsAt: fromSeconds(raw.checkInEndsAt),
    capacity: raw.capacity,
    held: raw.held,
    checkedIn: raw.checkedIn,
    forfeitPolicy: raw.forfeitPolicy as ForfeitPolicy,
    cancelled: raw.cancelled,
    settled: raw.settled,
    bonusPerAttendee: raw.bonusPerAttendee,
    beneficiary: raw.beneficiary,
    bond: raw.bond,
    bondPerGuest: raw.bondPerGuest,
    details: decodeDetails(raw.metadata),
  };
}
