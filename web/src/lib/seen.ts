/**
 * What an organizer last saw for each event (RSVP count), so home can say "+3 new" — per browser,
 * best effort, no server.
 */
const KEY = "shwup:seen-held";

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function lastSeenHeld(eventId: bigint): number | undefined {
  return read()[eventId.toString()];
}

export function markSeen(eventId: bigint, held: number) {
  try {
    const all = read();
    if (all[eventId.toString()] === held) return;
    all[eventId.toString()] = held;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage blocked
  }
}
