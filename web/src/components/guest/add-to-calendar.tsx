"use client";

import { CalendarPlus } from "lucide-react";
import { googleCalendarUrl, icsFile } from "@/domain/calendar";
import type { ShwUpEvent } from "@/domain/event";
import { useOrigin } from "@/hooks/use-origin";
import { formatUsd } from "@/lib/money";

/** Google Calendar link + .ics download (Apple Calendar, Outlook). Both carry a 2-hour reminder or link back. */
export function AddToCalendar({ event }: { event: ShwUpEvent }) {
  const origin = useOrigin();
  if (!origin) return null;
  const url = `${origin}/e/${event.id}`;
  const deposit = formatUsd(event.deposit);

  const download = () => {
    const blob = new Blob([icsFile(event, url, deposit)], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href, download: `${event.details.name.replace(/[^\w-]+/g, "-").slice(0, 40) || "event"}.ics` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-ink-2">
        <CalendarPlus className="size-4 text-ink-3" /> Add to calendar:
      </span>
      <a href={googleCalendarUrl(event, url, deposit)} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-4 hover:underline">
        Google
      </a>
      <button onClick={download} className="font-medium text-ink underline-offset-4 hover:underline">
        Apple / Outlook
      </button>
    </div>
  );
}
