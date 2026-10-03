import { formatUnits } from "viem";
import { encodeDetails, ForfeitPolicy, LIMITS, type ShwUpEvent } from "@/domain/event";
import { parseUsd } from "@/lib/money";
import { toSeconds } from "@/lib/time";

const HOUR = 3_600_000;

/** How long before the start attendees can still cancel for a refund. `null` = never after RSVP. */
export const CANCEL_OPTIONS = [
  { value: "168", label: "Up to 1 week before" },
  { value: "24", label: "Up to 24 hours before" },
  { value: "2", label: "Up to 2 hours before" },
  { value: "0", label: "Any time before it starts" },
  { value: "none", label: "No cancellations" },
] as const;
export type CancelOption = (typeof CANCEL_OPTIONS)[number]["value"];

/** How long after the start doors stay open for check-in. */
export const DOORS_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "3", label: "3 hours" },
  { value: "6", label: "6 hours" },
  { value: "12", label: "12 hours" },
] as const;
export type DoorsOption = (typeof DOORS_OPTIONS)[number]["value"];

export const DEPOSIT_PRESETS = ["2", "5", "10", "20"] as const;
export const MAX_DEPOSIT_USD = 1_000;

export type CreateEventForm = {
  name: string;
  location: string;
  description: string;
  startsAt: string; // datetime-local value
  deposit: string; // dollars as typed
  capacity: string; // blank = unlimited
  cancel: CancelOption;
  doors: DoorsOption;
  forfeit: ForfeitPolicy;
};

export function defaultForm(now = new Date()): CreateEventForm {
  const start = new Date(now);
  start.setDate(start.getDate() + 7);
  start.setHours(18, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    name: "",
    location: "",
    description: "",
    startsAt: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T18:30`,
    deposit: "5",
    capacity: "",
    cancel: "24",
    doors: "3",
    forfeit: ForfeitPolicy.Attendees,
  };
}

export type FormErrors = Partial<Record<keyof CreateEventForm, string>>;

export type CreateEventArgs = readonly [
  deposit: bigint,
  capacity: number,
  startsAt: bigint,
  cancelCutoff: bigint,
  checkInEndsAt: bigint,
  forfeitPolicy: number,
  metadata: string,
];

/** Validate the form and convert it into `createEvent` arguments. */
export function buildCreateEvent(
  form: CreateEventForm,
  now = new Date(),
): { ok: true; args: CreateEventArgs; start: Date; cutoff: Date; doorsClose: Date } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};

  const name = form.name.trim();
  if (!name) errors.name = "Give your event a name.";
  else if (name.length > LIMITS.name) errors.name = `Keep it under ${LIMITS.name} characters.`;

  const location = form.location.trim();
  if (!location) errors.location = "Where should people show up?";
  else if (location.length > LIMITS.location) errors.location = `Keep it under ${LIMITS.location} characters.`;

  if (form.description.trim().length > LIMITS.description) {
    errors.description = `Keep it under ${LIMITS.description} characters.`;
  }

  const start = new Date(form.startsAt);
  if (Number.isNaN(start.getTime())) errors.startsAt = "Pick a date and time.";
  else if (start.getTime() < now.getTime() + 10 * 60_000) errors.startsAt = "Start at least 10 minutes from now.";
  else if (start.getTime() > now.getTime() + 365 * 24 * HOUR) errors.startsAt = "Events can be up to a year ahead.";

  const deposit = parseUsd(form.deposit);
  const depositUsd = Number(form.deposit.replace(/^\$/, ""));
  if (deposit === null || deposit === 0n) errors.deposit = "Enter a deposit, like 5 or 2.50.";
  else if (depositUsd > MAX_DEPOSIT_USD) errors.deposit = `Deposits are capped at $${MAX_DEPOSIT_USD}.`;

  let capacity = 0;
  if (form.capacity.trim()) {
    capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000) errors.capacity = "Use a whole number, or leave blank for no limit.";
  }

  if (Object.keys(errors).length > 0 || deposit === null) return { ok: false, errors };

  const cutoff =
    form.cancel === "none"
      ? new Date(Math.min(now.getTime(), start.getTime()))
      : new Date(start.getTime() - Number(form.cancel) * HOUR);
  // A cutoff in the past just means "no cancellations" — that's what the contract does with it.
  const doorsClose = new Date(start.getTime() + Number(form.doors) * HOUR);

  const metadata = encodeDetails({ name, location, description: form.description });
  if (new TextEncoder().encode(metadata).length > LIMITS.metadataBytes) {
    return { ok: false, errors: { description: "The event details are too long." } };
  }

  return {
    ok: true,
    start,
    cutoff,
    doorsClose,
    args: [deposit, capacity, toSeconds(start), toSeconds(cutoff), toSeconds(doorsClose), form.forfeit, metadata] as const,
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const toLocalInputValue = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** Snap a gap in hours to the closest offered option. */
function closest<T extends string>(hours: number, options: readonly { value: T }[], numeric: (v: T) => number): T {
  return options.reduce((best, o) => (Math.abs(numeric(o.value) - hours) < Math.abs(numeric(best.value) - hours) ? o : best)).value;
}

/** Settings an organizer reuses from event to event. */
export type OrganizerDefaults = Pick<CreateEventForm, "location" | "deposit" | "capacity" | "cancel" | "doors" | "forfeit">;

export function defaultsFromForm(form: CreateEventForm): OrganizerDefaults {
  return { location: form.location.trim(), deposit: form.deposit, capacity: form.capacity, cancel: form.cancel, doors: form.doors, forfeit: form.forfeit };
}

/** A new form that starts from what this organizer did last time. */
export function formWithDefaults(defaults: Partial<OrganizerDefaults> | null, now = new Date()): CreateEventForm {
  return { ...defaultForm(now), ...(defaults ?? {}) };
}

/**
 * "Run it again": same details and terms, same weekday and time, the first weekly slot that's still
 * in the future.
 */
export function formFromEvent(
  e: Pick<ShwUpEvent, "details" | "deposit" | "capacity" | "startsAt" | "cancelCutoff" | "checkInEndsAt" | "forfeitPolicy">,
  now = new Date(),
): CreateEventForm {
  const week = 7 * 24 * HOUR;
  let start = e.startsAt.getTime() + week;
  while (start < now.getTime() + 10 * 60_000) start += week;

  const cutoffHours = (e.startsAt.getTime() - e.cancelCutoff.getTime()) / HOUR;
  // "No cancellations" is stored as a cutoff at creation time, indistinguishable from a long lead;
  // snapping to the nearest offered window is the honest best guess.
  const cancel = closest(cutoffHours, CANCEL_OPTIONS.filter((o) => o.value !== "none"), (v) => Number(v));
  const doors = closest((e.checkInEndsAt.getTime() - e.startsAt.getTime()) / HOUR, DOORS_OPTIONS, (v) => Number(v));

  return {
    name: e.details.name,
    location: e.details.location,
    description: e.details.description ?? "",
    startsAt: toLocalInputValue(new Date(start)),
    deposit: formatUnits(e.deposit, 18).replace(/\.0$/, ""),
    capacity: e.capacity ? String(e.capacity) : "",
    cancel,
    doors,
    forfeit: e.forfeitPolicy,
  };
}
