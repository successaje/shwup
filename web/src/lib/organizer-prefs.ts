import type { OrganizerDefaults } from "@/domain/create-event";

const KEY = "shwup:organizer-defaults";

/** Per-browser memory of an organizer's usual venue, deposit and rules. A convenience, never required. */
export function loadOrganizerDefaults(): Partial<OrganizerDefaults> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<OrganizerDefaults>) : null;
  } catch {
    return null;
  }
}

export function saveOrganizerDefaults(d: OrganizerDefaults) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // storage blocked: nothing to remember
  }
}
