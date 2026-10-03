"use client";

import { ShieldCheck } from "lucide-react";
import { organizerRecord } from "@/domain/activity";
import { ForfeitPolicy, forfeitRecipient, type ShwUpEvent } from "@/domain/event";
import { useNames, useOrganizerEvents } from "@/hooks/use-shwup";
import { shortAddress } from "@/lib/address";

/**
 * Who's running this, and how their past events actually went — from public contract state.
 * Most useful under the "organizer keeps no-show deposits" policy, where guests take the
 * organizer's word that they'll be scanned.
 */
export function OrganizerRecord({ event }: { event: ShwUpEvent }) {
  const { events } = useOrganizerEvents(event.organizer);
  const { nameFor } = useNames([event.organizer]);
  const name = nameFor(event.organizer) ?? shortAddress(event.organizer);
  const record = events ? organizerRecord(events.filter((e) => e.id !== event.id)) : null;

  let detail: string | null = null;
  if (record) {
    detail =
      record.finished === 0
        ? record.hosted === 0
          ? "First event on ShwUp."
          : "No finished events yet."
        : `${record.finished} past ${record.finished === 1 ? "event" : "events"} · ${Math.round((record.showUpRate ?? 0) * 100)}% of RSVPs were checked in.`;
  }

  return (
    <div className="flex items-start gap-2.5 text-xs text-ink-3">
      <ShieldCheck className="mt-px size-3.5 shrink-0" />
      <p>
        Hosted by <span className="text-ink-2">{name}</span>
        {detail && <> · {detail}</>}
        {event.forfeitPolicy === ForfeitPolicy.Organizer && " The organizer keeps no-show deposits for this event."}
        {event.forfeitPolicy === ForfeitPolicy.Beneficiary && ` No-show deposits go to ${forfeitRecipient(event)}.`}
      </p>
    </div>
  );
}
