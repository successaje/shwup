"use client";

import { Avatar } from "@/components/wallet/account-button";
import { TicketStatus, type ShwUpEvent } from "@/domain/event";
import { useAttendees, useNames } from "@/hooks/use-shwup";

/** Social proof from public on-chain data: who's holding a spot, named where people chose to be. */
export function WhosGoing({ event }: { event: ShwUpEvent }) {
  const { rows } = useAttendees(event.id);
  const going = rows?.filter((r) => r.status === TicketStatus.Held || r.status === TicketStatus.CheckedIn) ?? [];
  const { nameFor } = useNames(going.map((r) => r.address));
  if (going.length === 0) return null;

  const named = going.map((r) => nameFor(r.address)).filter((n): n is string => !!n);
  const shown = named.slice(0, 3);
  const others = going.length - shown.length;
  const sentence =
    shown.length === 0
      ? `${going.length} ${going.length === 1 ? "person is" : "people are"} going`
      : `${shown.join(", ")}${others > 0 ? ` and ${others} other${others === 1 ? "" : "s"}` : ""} ${going.length === 1 ? "is" : "are"} going`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-1.5">
        {going.slice(0, 6).map((r) => (
          <Avatar key={r.address} address={r.address} className="size-7 ring-2 ring-paper" />
        ))}
      </div>
      <p className="text-sm text-ink-2">{sentence}</p>
    </div>
  );
}
