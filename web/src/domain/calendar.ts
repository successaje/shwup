import type { ShwUpEvent } from "@/domain/event";

/**
 * Calendar entries are ShwUp's reminder system: no accounts, no emails, no servers — the guest's own
 * calendar reminds them, two hours before, to bring their ticket.
 */

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Calendar entries span start → when check-in closes (the window in which you get your deposit back). */
function span(e: Pick<ShwUpEvent, "startsAt" | "checkInEndsAt">) {
  return { start: e.startsAt, end: e.checkInEndsAt };
}

function describe(e: ShwUpEvent, url: string, depositText: string) {
  const parts = [
    `Your ${depositText} deposit comes back when you're checked in at the door. Bring your ticket:`,
    url,
  ];
  if (e.details.description) parts.push("", e.details.description);
  return parts.join("\n");
}

export function googleCalendarUrl(e: ShwUpEvent, url: string, depositText: string): string {
  const { start, end } = span(e);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.details.name,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: describe(e, url, depositText),
    location: e.details.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** RFC 5545 text escaping. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 lines are folded at 75 octets. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function icsFile(e: ShwUpEvent, url: string, depositText: string, now = new Date()): string {
  const { start, end } = span(e);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShwUp//Refundable RSVPs//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:shwup-${e.id}@shwup.app`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.details.name)}`,
    `LOCATION:${esc(e.details.location)}`,
    `DESCRIPTION:${esc(describe(e, url, depositText))}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${e.details.name} — bring your ShwUp ticket to get your deposit back`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
