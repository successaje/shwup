import { ForfeitPolicy } from "@/domain/event";
import type { CreateEventForm } from "@/domain/create-event";

/**
 * Starting points for the kinds of commitment ShwUp handles. They're all the same contract call —
 * a deposit, a time, a door — with different terms.
 */
export const TEMPLATES = {
  meetup: {
    label: "Community event",
    blurb: "Free to attend. No-shows' deposits go to the people who came.",
    form: { deposit: "5", capacity: "", cancel: "24", doors: "3", forfeit: ForfeitPolicy.Attendees },
  },
  table: {
    label: "Restaurant table",
    blurb: "One booking. Back when you're seated; a late cancel or no-show covers the empty table.",
    form: { name: "Table for 4", deposit: "20", capacity: "1", cancel: "4", doors: "1", forfeit: ForfeitPolicy.Organizer },
  },
  appointment: {
    label: "Appointment",
    blurb: "One slot. Back when you arrive; cancel a day ahead and it's back too.",
    form: { name: "Consultation · 30 min", deposit: "10", capacity: "1", cancel: "24", doors: "1", forfeit: ForfeitPolicy.Organizer },
  },
} as const satisfies Record<string, { label: string; blurb: string; form: Partial<CreateEventForm> }>;

export type TemplateKey = keyof typeof TEMPLATES;

export function templateFor(key: string | null | undefined): (typeof TEMPLATES)[TemplateKey] | undefined {
  return key && Object.hasOwn(TEMPLATES, key) ? TEMPLATES[key as TemplateKey] : undefined;
}
